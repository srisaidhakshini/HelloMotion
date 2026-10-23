#pragma once
#include <windows.h>
#include <string>
#include <vector>
#include <cstdint>
#include <cstring>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <atomic>
#include <chrono>
#include <algorithm>

inline constexpr GUID HELLOMOTION_PIPE = {0xec8e0b1f,0x1519,0x47e5,{0xa1,0x22,0xcf,0xc4,0x41,0x9d,0xf6,0x02}};
inline constexpr wchar_t HELLOMOTION_CLSID[] = L"{A719E0B3-8C86-4C0C-BA04-CE326F5BA713}";

// Pipe I/O never runs in Media Foundation's sample request callback.
// A single polling worker replaces a bounded latest-frame cache.
class FrameReader {
    static constexpr DWORD Bytes=960*540*4;
    static constexpr ULONGLONG StaleMs=1500;
    std::wstring endpoint;
    std::thread worker;
    std::atomic<bool> stopping{true};
    std::mutex frameMutex,waitMutex;
    std::condition_variable wake;
    std::vector<BYTE> latest;
    ULONGLONG updated=0;
    bool Read(std::vector<BYTE>& pixels) {
        HANDLE pipe=CreateFileW(endpoint.c_str(),GENERIC_READ,0,nullptr,OPEN_EXISTING,FILE_FLAG_OVERLAPPED,nullptr);
        if(pipe==INVALID_HANDLE_VALUE)return false;
        HANDLE event=CreateEventW(nullptr,TRUE,FALSE,nullptr);
        if(!event){CloseHandle(pipe);return false;}
        const ULONGLONG deadline=GetTickCount64()+150;
        auto read=[&](BYTE* dest,DWORD bytes){
            DWORD total=0;
            while(total<bytes){
                OVERLAPPED op{};op.hEvent=event;ResetEvent(event);DWORD count=0;
                BOOL ok=ReadFile(pipe,dest+total,bytes-total,&count,&op);
                if(!ok&&GetLastError()==ERROR_IO_PENDING){
                    const auto now=GetTickCount64();
                    if(now>=deadline||WaitForSingleObject(event,DWORD(deadline-now))!=WAIT_OBJECT_0){CancelIoEx(pipe,&op);GetOverlappedResult(pipe,&op,&count,TRUE);return false;}
                    ok=GetOverlappedResult(pipe,&op,&count,FALSE);
                }
                if(!ok||!count)return false;
                total+=count;
            }
            return true;
        };
        uint32_t header[8]{};
        bool ok=read(reinterpret_cast<BYTE*>(header),sizeof(header));
        ok=ok&&memcmp(header,"HMF1",4)==0&&header[1]==1&&header[2]==960&&header[3]==540&&header[4]==3840&&header[5]==Bytes;
        if(ok)ok=read(pixels.data(),Bytes);
        CloseHandle(event);CloseHandle(pipe);return ok;
    }
    void Run(){
        std::vector<BYTE> incoming(Bytes);
        while(!stopping){
            const auto next=std::chrono::steady_clock::now()+std::chrono::milliseconds(33);
            if(Read(incoming)){
                std::lock_guard<std::mutex> lock(frameMutex);
                latest.swap(incoming);updated=GetTickCount64();
            }
            std::unique_lock<std::mutex> lock(waitMutex);
            wake.wait_until(lock,next,[&]{return stopping.load();});
        }
    }
public:
    FrameReader():latest(Bytes){}
    ~FrameReader(){Stop();}
    FrameReader(const FrameReader&)=delete;
    FrameReader& operator=(const FrameReader&)=delete;
    void Stop(){
        stopping=true;wake.notify_all();if(worker.joinable())worker.join();
        std::lock_guard<std::mutex> lock(frameMutex);updated=0;std::fill(latest.begin(),latest.end(),0);
    }
    void SetEndpoint(const wchar_t* value){
        Stop();endpoint=value?value:L"";
        if(endpoint.rfind(L"\\\\.\\pipe\\HelloMotion-",0)!=0)return;
        stopping=false;worker=std::thread([this]{Run();});
    }
    bool Copy(BYTE* target,DWORD length,LONG pitch,DWORD width,DWORD height){
        if(!target||pitch<=0||width!=960||height!=540||DWORD(pitch)<width*4||length<DWORD(pitch)*height)return false;
        std::lock_guard<std::mutex> lock(frameMutex);
        const bool fresh=updated&&GetTickCount64()-updated<StaleMs;
        for(DWORD y=0;y<height;++y){if(fresh)memcpy(target+y*pitch,latest.data()+y*width*4,width*4);else memset(target+y*pitch,0,width*4);}
        return fresh;
    }
};
