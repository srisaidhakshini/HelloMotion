// Integration probe: opens only the HelloMotion virtual device, never a webcam.
#include <windows.h>
#include <mfapi.h>
#include <mfidl.h>
#include <mfreadwrite.h>
#include <mferror.h>
#include <wrl/client.h>
#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
#include "FrameReader.h"
using Microsoft::WRL::ComPtr;
static int fail(const char* step,HRESULT hr){std::cerr<<step<<": 0x"<<std::hex<<unsigned(hr)<<std::endl;return 1;}
int main(int argc,char** argv){
    if(argc==3&&std::string(argv[1])=="--reader"){
        const std::string narrow=argv[2];std::wstring endpoint(narrow.begin(),narrow.end());
        FrameReader frames;frames.SetEndpoint(endpoint.c_str());std::vector<BYTE> pixels(960*540*4);std::string command;
        std::cout<<"READER_READY"<<std::endl;
        while(std::getline(std::cin,command)&&command!="stop"){
            const auto began=GetTickCount64();
            for(int n=0;n<40;++n)frames.Copy(pixels.data(),DWORD(pixels.size()),3840,960,540);
            const auto elapsed=GetTickCount64()-began;
            const bool color=pixels[0]==90&&pixels[1]==20&&pixels[2]==200;
            const bool black=pixels[0]==0&&pixels[1]==0&&pixels[2]==0;
            if((command=="color"&&!color)||(command=="black"&&!black)||elapsed>200){std::cerr<<"Reader mismatch or blocking Copy: "<<command<<" elapsed="<<elapsed<<std::endl;return 1;}
            std::cout<<"READER_PASS "<<command<<" copyMs="<<elapsed<<std::endl;
        }
        frames.Stop();return 0;
    }
    HRESULT hr=CoInitializeEx(nullptr,COINIT_MULTITHREADED);if(FAILED(hr))return fail("COM",hr);
    hr=MFStartup(MF_VERSION);if(FAILED(hr))return fail("MF",hr);
    ComPtr<IMFAttributes> attrs;MFCreateAttributes(&attrs,1);
    attrs->SetGUID(MF_DEVSOURCE_ATTRIBUTE_SOURCE_TYPE,MF_DEVSOURCE_ATTRIBUTE_SOURCE_TYPE_VIDCAP_GUID);
    IMFActivate** devices=nullptr;UINT32 count=0;hr=MFEnumDeviceSources(attrs.Get(),&devices,&count);if(FAILED(hr))return fail("Enumerate",hr);
    ComPtr<IMFMediaSource> source;
    for(UINT32 i=0;i<count;++i){
        wchar_t* name=nullptr;UINT32 length=0;
        if(SUCCEEDED(devices[i]->GetAllocatedString(MF_DEVSOURCE_ATTRIBUTE_FRIENDLY_NAME,&name,&length))){
            if(std::wstring(name).rfind(L"HelloMotion",0)==0){
                std::wcout<<L"Found "<<name<<std::endl;
                hr=devices[i]->ActivateObject(IID_PPV_ARGS(&source));
            }
            CoTaskMemFree(name);
        }
        devices[i]->Release();
    }
    CoTaskMemFree(devices);
    if(!source)return fail("HelloMotion activation",FAILED(hr)?hr:MF_E_NOT_FOUND);
    ComPtr<IMFAttributes> options;MFCreateAttributes(&options,1);options->SetUINT32(MF_SOURCE_READER_ENABLE_VIDEO_PROCESSING,TRUE);
    ComPtr<IMFSourceReader> reader;hr=MFCreateSourceReaderFromMediaSource(source.Get(),options.Get(),&reader);if(FAILED(hr))return fail("Reader",hr);
    ComPtr<IMFMediaType> type;MFCreateMediaType(&type);type->SetGUID(MF_MT_MAJOR_TYPE,MFMediaType_Video);type->SetGUID(MF_MT_SUBTYPE,MFVideoFormat_RGB32);
    hr=reader->SetCurrentMediaType(MF_SOURCE_READER_FIRST_VIDEO_STREAM,nullptr,type.Get());if(FAILED(hr))return fail("RGB32",hr);
    bool stability=false,pattern=false;
    for(int i=1;i<argc;++i){std::string arg=argv[i];stability|=arg=="--stability";pattern|=arg=="--pattern";}
    bool found=false;int received=0,blanks=0,backwards=0,motion=0;uint32_t lastHash=0;LONGLONG previous=-1;
    std::vector<LONGLONG> stamps;ULONGLONG started=GetTickCount64();
    for(int i=0;stability?(GetTickCount64()-started<6000):(i<30&&!found);++i){
        ComPtr<IMFSample> sample;DWORD flags=0;hr=reader->ReadSample(MF_SOURCE_READER_FIRST_VIDEO_STREAM,0,nullptr,&flags,nullptr,&sample);
        if(FAILED(hr))return fail("Capture",hr);if(!sample)continue;
        ComPtr<IMFMediaBuffer> buffer;sample->ConvertToContiguousBuffer(&buffer);BYTE* bytes=nullptr;DWORD length=0;
        hr=buffer->Lock(&bytes,nullptr,&length);if(FAILED(hr))return fail("Lock",hr);
        // Producer emits R=200 G=20 B=90; allow rounding in the NV12 conversion.
        unsigned matches=0;
        for(DWORD j=0;j+3<length;j+=4){
            if(pattern){if(bytes[j]>170&&bytes[j]<218&&bytes[j+1]>154&&bytes[j+1]<202&&bytes[j+2]>208)++matches;}
            else if(bytes[j]>65&&bytes[j]<115&&bytes[j+1]<45&&bytes[j+2]>175&&bytes[j+2]<225)++matches;
        }
        uint32_t hash=2166136261u;for(DWORD j=0;j<length;j+=64)hash=(hash^bytes[j])*16777619u;
        if(received>=15&&hash!=lastHash)++motion;lastHash=hash;
        buffer->Unlock();found=matches>10000;
        LONGLONG stamp=0;sample->GetSampleTime(&stamp);
        if(received>=15){if(!found)++blanks;if(previous>=stamp)++backwards;stamps.push_back(stamp);}
        previous=stamp;++received;

    }
    reader.Reset();source->Shutdown();source.Reset();MFShutdown();CoUninitialize();
    if(stability){
        const double seconds=double(GetTickCount64()-started)/1000;
        const double fps=stamps.size()>1?(stamps.size()-1)*10000000.0/(stamps.back()-stamps.front()):0;
        LONGLONG largestGap=0;for(size_t i=1;i<stamps.size();++i)largestGap=(std::max)(largestGap,stamps[i]-stamps[i-1]);
        std::cout<<"STABILITY frames="<<received<<" movingFrames="<<motion<<" black="<<blanks<<" timestampErrors="<<backwards<<" fps="<<fps<<" maxGapMs="<<largestGap/10000.0<<" elapsed="<<seconds<<std::endl;
        if(blanks||backwards||(pattern&&motion<30)||fps<20||fps>40||largestGap>2500000){std::cerr<<"Unstable camera stream"<<std::endl;return 1;}
    }
    if(!found){std::cerr<<"No expected test pixels received"<<std::endl;return 1;}
    std::cout<<"PASS: Windows virtual camera delivers HelloMotion frames"<<std::endl;return 0;
}
