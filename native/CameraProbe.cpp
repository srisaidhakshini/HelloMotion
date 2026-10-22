// Integration probe: opens only the HelloMotion virtual device, never a webcam.
#include <windows.h>
#include <mfapi.h>
#include <mfidl.h>
#include <mfreadwrite.h>
#include <mferror.h>
#include <wrl/client.h>
#include <iostream>
#include <string>
using Microsoft::WRL::ComPtr;
static int fail(const char* step,HRESULT hr){std::cerr<<step<<": 0x"<<std::hex<<unsigned(hr)<<std::endl;return 1;}
int main(int argc,char** argv){
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
    bool found=false;
    for(int i=0;i<30 && !found;++i){
        ComPtr<IMFSample> sample;DWORD flags=0;hr=reader->ReadSample(MF_SOURCE_READER_FIRST_VIDEO_STREAM,0,nullptr,&flags,nullptr,&sample);
        if(FAILED(hr))return fail("Capture",hr);if(!sample)continue;
        ComPtr<IMFMediaBuffer> buffer;sample->ConvertToContiguousBuffer(&buffer);BYTE* bytes=nullptr;DWORD length=0;
        hr=buffer->Lock(&bytes,nullptr,&length);if(FAILED(hr))return fail("Lock",hr);
        // Producer emits R=200 G=20 B=90; allow rounding in the NV12 conversion.
        unsigned matches=0;
        for(DWORD j=0;j+3<length;j+=4){
            if(argc>1){if(bytes[j]>170&&bytes[j]<218&&bytes[j+1]>154&&bytes[j+1]<202&&bytes[j+2]>208)++matches;}
            else if(bytes[j]>65&&bytes[j]<115&&bytes[j+1]<45&&bytes[j+2]>175&&bytes[j+2]<225)++matches;
        }
        buffer->Unlock();found=matches>10000;
    }
    reader.Reset();source->Shutdown();source.Reset();MFShutdown();CoUninitialize();
    if(!found){std::cerr<<"No expected test pixels received"<<std::endl;return 1;}
    std::cout<<"PASS: Windows virtual camera delivers HelloMotion frames"<<std::endl;return 0;
}
