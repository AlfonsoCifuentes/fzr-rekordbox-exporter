; Custom NSIS Branding for FZR Rekordbox Exporter v2.1.0
; Fuses Pioneer Rekordbox, Traktor Pro, Soulseek Autopilot, and Spotify aesthetic into the Windows installer wizard.

!macro customHeader
  !ifndef MUI_WELCOMEPAGE_TITLE
    !define MUI_WELCOMEPAGE_TITLE "FZR Booth OS v2.1"
  !endif
  !ifndef MUI_WELCOMEPAGE_TEXT
    !define MUI_WELCOMEPAGE_TEXT "Bienvenido a FZR Booth OS v2.1 - Hub 100% local para cabinas DJ.$\r$\n$\r$\nIncluye deteccion automatica en tu PC y soporte nativo para:$\r$\n  - Auto-deteccion de Rekordbox, Traktor Pro, Serato (.crate) y VirtualDJ$\r$\n  - FZR Soulseek Autopilot nativo (FLAC / Hi-Res / 320kbps, Dry-Run, Pausa/Reanudar)$\r$\n  - Spotify OAuth PKCE + Importador directo de playlists publicas por URL$\r$\n  - Rueda Camelot, Curva BPM, CUE Sheet y Booth Prep HTML$\r$\n$\r$\nPulsa Siguiente para iniciar la instalacion."
  !endif
  !ifndef MUI_FINISHPAGE_TITLE
    !define MUI_FINISHPAGE_TITLE "FZR Booth OS v2.1 listo para la cabina"
  !endif
  !ifndef MUI_FINISHPAGE_TEXT
    !define MUI_FINISHPAGE_TEXT "Instalacion completada con exito.$\r$\n$\r$\nTu libreria, credenciales cifradas y musica nunca salen de tu ordenador. Ya puedes abrir FZR y empezar."
  !endif
  !ifndef MUI_FINISHPAGE_RUN_TEXT
    !define MUI_FINISHPAGE_RUN_TEXT "Abrir FZR Booth OS v2.1 ahora"
  !endif
  !ifndef MUI_FINISHPAGE_LINK
    !define MUI_FINISHPAGE_LINK "Visitar FZR Web Deck (fzr-rekordbox-exporter.pages.dev)"
  !endif
  !ifndef MUI_FINISHPAGE_LINK_LOCATION
    !define MUI_FINISHPAGE_LINK_LOCATION "https://fzr-rekordbox-exporter.pages.dev"
  !endif
!macroend
