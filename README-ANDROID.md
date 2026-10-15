# re:Blue para Android

Port de [re:Blue](https://github.com/zolaware/reblue) (Blue Dragon recompilado) a Android ARM64, con su SDK [ReXGlue](https://github.com/rexglue/rexglue-sdk).

> **Solo para uso personal.** El APK contiene código generado a partir de tu `default.xex`, así que lleva código del juego: no lo compartas ni lo subas a ningún sitio. Necesitas tus propios discos de Blue Dragon.

## Estado

| Parte | Estado |
|---|---|
| SDK ReXGlue para Android arm64 | Compila e instala (`librexruntime.so`) |
| re:Blue para Android | 204 de 214 archivos compilan; los 10 que faltan solo necesitan el código generado desde tu `default.xex` |
| Herramientas del PC (codegen, XenosRecomp, dxc) | Compiladas y probadas |
| Proyecto Android (Gradle/APK) | Compila |
| Probado en un móvil | **Todavía no** |

## Requisitos

- **Móvil:** Android 13 o superior, ARM64, Vulkan 1.2. Recomendado: Snapdragon 8 Gen 2 o superior (Adreno), con 12 GB de RAM o más. En GPUs Mali los drivers Vulkan suelen dar más problemas.
- **Espacio en el móvil:** unos 15 GB para el juego instalado, más espacio temporal para las 3 ISOs mientras dura la instalación.
- **PC:** ya está todo instalado (Git, CMake, Ninja, LLVM, JDK 21, Python, Android SDK/NDK r29 y VS 2022 Build Tools).

## Compilar

Desde PowerShell, en `Documentos\reblue-android`:

```powershell
.\scripts\build-all.ps1 -Source "D:\Blue Dragon\disc1.iso","D:\Blue Dragon\disc2.iso","D:\Blue Dragon\disc3.iso"
```

Este script:

1. Lee las ISOs directamente (no hace falta montarlas ni extraerlas) y copia `default.xex` y los shaders `.vso/.pso` de los `.ipk` a `reblue\assets`. `-Source` también acepta una carpeta con los archivos del juego, por ejemplo la carpeta `game\` de un re:Blue instalado en el PC.
2. Compila las herramientas del PC y el SDK, si aún no están compilados.
3. Genera el código del juego (`rexglue codegen`), recompila los shaders a SPIR-V y compila `libreblue.so`.
4. Empaqueta el APK en `android\app\build\outputs\apk\release\app-release.apk`.

Añade `-Install` para instalarlo directamente con el móvil conectado por USB, con la depuración USB activada.

Cada paso también se puede ejecutar por separado: `prepare_assets.py`, `build-host-tools.ps1`, `build-sdk-android.ps1`, `build-reblue-android.ps1` y `build-apk.ps1`, todos en `scripts\`.

## Primera ejecución en el móvil

1. Copia las 3 ISOs al móvil (por ejemplo, a Descargas).
2. Abre re:Blue. Aparece el instalador de siempre: toca cada disco y elígelo en el selector de archivos de Android.
3. El juego se instala en el almacenamiento de la app: `Android/data/org.reblue.android/files/`, que también es accesible desde el PC por USB. Ahí están `game/`, `profiles/` (partidas y `reblue.toml`), `mods/` y `logs/`.
4. Cuando termine, puedes borrar las ISOs del móvil.

## Controles

- **Táctiles:** stick izquierdo flotante (mitad izquierda de la pantalla), cámara arrastrando en la mitad derecha, A/B/X/Y, cruceta, LB/RB/LT/RT, BACK y START. El juego los ve como un mando de Xbox 360, así que muestra los iconos de Xbox.
- **Mando físico** (Bluetooth o USB): al conectarlo, los controles táctiles se ocultan solos.
- En el instalador, los toques funcionan como ratón.

## Si algo falla

```bash
adb logcat -s rexglue
```

Los logs también se guardan en `Android/data/org.reblue.android/files/logs/`.

## Cambios del port

Están en la rama `android-port` de cada repositorio.

**SDK ReXGlue** (basado en `development`, el mismo SDK que usa re:Blue 1.3.1):

- Plataforma `android-arm64` en CMake. SDL3 usa su backend de Android y no hay dependencias de X11 ni Wayland.
- Superficie Vulkan a partir del `ANativeWindow` y punto de entrada `SDL_main`.
- Puente JNI para URIs `content://` y para el almacenamiento de la app.
- Cambio de contexto AArch64 para las fibras (Bionic no tiene `ucontext`) y `memfd_create` para la memoria del guest.
- Arreglos de compatibilidad con Bionic y con la libc++ del NDK.
- Logs a logcat.

**re:Blue:**

- Se compila como `libreblue.so`. El codegen, XenosRecomp y dxc corren en el PC.
- Swapchain en formato R8G8B8A8, que se recrea al volver del segundo plano.
- Instalación en el almacenamiento de la app, ISOs elegidas con el selector de Android y reinicio de la app a través de la Activity.
- Controles táctiles.

**Proyecto Android** (`android/`): `ReblueActivity`, que extiende `SDLActivity` y usa el Java de SDL directamente del submódulo del SDK, y `RestartActivity` para los ajustes que requieren reiniciar.

## Actualizar a una versión nueva de re:Blue

```powershell
cd reblue; git fetch origin; git rebase origin/main android-port
cd ..\rexglue-sdk; git fetch origin; git rebase origin/development android-port
```

Después, borra `build\sdk-android-install` y vuelve a ejecutar `build-all.ps1`. Si el CI de re:Blue usa otro nightly del SDK, descarga su `rexglue.exe` en `host-tools\sdk`.
