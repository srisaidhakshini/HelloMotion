#include <windows.h>
#include <mfapi.h>
#include <mfvirtualcamera.h>
#include <wrl/client.h>
#include <iostream>
#include <string>
#include "FrameReader.h"
using Microsoft::WRL::ComPtr;
static int fail(const char* step,HRESULT hr){std::cerr<<step<<" failed: 0x"<<std::hex<<unsigned(hr)<<std::endl;return 1;}
int wmain(int argc,wchar_t** argv){
    if(argc!=2 || std::wstring(argv[1]).rfind(L"\\\\.\\pipe\\HelloMotion-",0)!=0){std::cerr<<"Expected HelloMotion local pipe endpoint"<<std::endl;return 2;}
    HRESULT hr=CoInitializeEx(nullptr,COINIT_MULTITHREADED);if(FAILED(hr))return fail("COM",hr);
    hr=MFStartup(MF_VERSION);if(FAILED(hr))return fail("Media Foundation",hr);
    ComPtr<IMFVirtualCamera> camera;
    hr=MFCreateVirtualCamera(MFVirtualCameraType_SoftwareCameraSource,MFVirtualCameraLifetime_Session,MFVirtualCameraAccess_CurrentUser,L"HelloMotion",HELLOMOTION_CLSID,nullptr,0,&camera);
    if(FAILED(hr))return fail("Create camera",hr);
    hr=camera->SetString(HELLOMOTION_PIPE,argv[1]);if(FAILED(hr))return fail("Set endpoint",hr);
    hr=camera->Start(nullptr);if(FAILED(hr))return fail("Start camera",hr);
    std::cout<<"READY"<<std::endl;
    std::string command;std::getline(std::cin,command);
    camera->Stop();camera->Remove();camera->Shutdown();camera.Reset();
    MFShutdown();CoUninitialize();return 0;
}
