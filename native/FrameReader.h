#pragma once
#include <windows.h>
#include <string>
#include <vector>
#include <cstdint>
#include <cstring>

// Custom activation attribute shared with the registration helper.
inline constexpr GUID HELLOMOTION_PIPE = {0xec8e0b1f,0x1519,0x47e5,{0xa1,0x22,0xcf,0xc4,0x41,0x9d,0xf6,0x02}};
inline constexpr wchar_t HELLOMOTION_CLSID[] = L"{A719E0B3-8C86-4C0C-BA04-CE326F5BA713}";

class FrameReader {
    std::wstring endpoint;
public:
    void SetEndpoint(const wchar_t* value) { endpoint=value ? value : L""; }
    bool Copy(BYTE* target, DWORD length, LONG pitch, DWORD width, DWORD height) {
        if (!target || pitch <= 0 || width!=960 || height!=540 || DWORD(pitch)<width*4 || length<DWORD(pitch)*height) return false;
        // A missing producer always means black, never a cached personal frame.
        for(DWORD y=0;y<height;++y) memset(target+y*pitch,0,width*4);
        if(endpoint.rfind(L"\\\\.\\pipe\\HelloMotion-",0)!=0) return false;
        HANDLE pipe=CreateFileW(endpoint.c_str(),GENERIC_READ,0,nullptr,OPEN_EXISTING,FILE_FLAG_OVERLAPPED,nullptr);
        if(pipe==INVALID_HANDLE_VALUE) return false;
        HANDLE event=CreateEventW(nullptr,TRUE,FALSE,nullptr);
        if(!event){CloseHandle(pipe);return false;}
        const ULONGLONG deadline=GetTickCount64()+150;
        auto read=[&](BYTE* dest,DWORD bytes) {
            DWORD total=0;
            while(total<bytes){
                OVERLAPPED op{};op.hEvent=event;ResetEvent(event);DWORD count=0;
                BOOL ok=ReadFile(pipe,dest+total,bytes-total,&count,&op);
                if(!ok && GetLastError()==ERROR_IO_PENDING){
                    const auto now=GetTickCount64();
                    if(now>=deadline || WaitForSingleObject(event,DWORD(deadline-now))!=WAIT_OBJECT_0){CancelIoEx(pipe,&op);GetOverlappedResult(pipe,&op,&count,TRUE);return false;}
                    ok=GetOverlappedResult(pipe,&op,&count,FALSE);
                }
                if(!ok || !count) return false;
                total+=count;
            }
            return true;
        };
        uint32_t header[8]{};
        bool ok=read(reinterpret_cast<BYTE*>(header),sizeof(header));
        ok=ok && memcmp(header,"HMF1",4)==0 && header[1]==1 && header[2]==width && header[3]==height && header[4]==width*4 && header[5]==width*height*4;
        if(ok){
            std::vector<BYTE> pixels(header[5]);
            ok=read(pixels.data(),header[5]);
            if(ok)for(DWORD y=0;y<height;++y)memcpy(target+y*pitch,pixels.data()+y*width*4,width*4);
        }
        CloseHandle(event);CloseHandle(pipe);return ok;
    }
};
