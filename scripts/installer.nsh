!macro customInstall
  SetRegView 64
  WriteRegStr HKLM "Software\Classes\CLSID\{A719E0B3-8C86-4C0C-BA04-CE326F5BA713}" "" "HelloMotion Camera Source"
  WriteRegStr HKLM "Software\Classes\CLSID\{A719E0B3-8C86-4C0C-BA04-CE326F5BA713}\InprocServer32" "" "$INSTDIR\resources\native\bin\HelloMotionCamera.dll"
  WriteRegStr HKLM "Software\Classes\CLSID\{A719E0B3-8C86-4C0C-BA04-CE326F5BA713}\InprocServer32" "ThreadingModel" "Both"
!macroend

!macro customUnInstall
  SetRegView 64
  DeleteRegKey HKLM "Software\Classes\CLSID\{A719E0B3-8C86-4C0C-BA04-CE326F5BA713}"
!macroend
