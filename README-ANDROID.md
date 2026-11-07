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

## Descargar el código

Los cambios del port están en la rama `android-port` de cuatro forks. Se clonan dentro de esta carpeta:

```bash
git clone https://github.com/zackfairestar-debug/reblue-android
```
```bash
cd reblue-android
```
```bash
git clone --branch android-port --recurse-submodules https://github.com/zackfairestar-debug/reblue
```
```bash
git clone --branch android-port --recurse-submodules https://github.com/zackfairestar-debug/rexglue-sdk
```

Los submódulos de `reblue` (plume y XenosRecomp) ya apuntan a sus forks con los cambios para Android.

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

## Calor y batería

En **Ajustes → Pantalla → Tasa FPS** hay una opción nueva, **Ahorro de energía**:

- **Auto** (la de serie): con batería juega a 30 fps, la velocidad original del juego (la lógica de Blue Dragon va siempre a 30 Hz; lo que pasa de ahí es interpolación). Con el cargador sube a 60 fps, salvo que Android avise de que la consola está caliente. En el Thor, a 60 fps la batería bajaba un 1 % por minuto y la consola no avisaba nunca del calor, por eso Auto ya no espera a esa señal.
- **Máx:** siempre a 30 fps. Es la que menos calienta y más batería ahorra.
- **Desactivado:** nunca baja.

También se cambia desde la pantalla de abajo: en ⚙ del panel está «Ahorro de energía (juego)» y, debajo, en directo, los fps, la temperatura y la batería.

Con el cargador, si la consola no informa de su margen térmico (el Thor no lo hace), Auto se guía también por la temperatura de la batería: baja a 30 fps a partir de 40 °C y vuelve a 60 cuando lleva 45 s por debajo de 37 °C. Si quieres 60 fps también con batería, elige **Desactivado**.

Además, sin tocar nada:

- **Resolución interna 1280×720**, la original del juego, en vez de la de la pantalla (1920×1080 en el Thor): la GPU dibuja 2,25 veces menos píxeles. Se aplica una vez; si eliges otra en Ajustes → Pantalla → Resolución (o «Auto» para la nativa), se respeta.

- Con la app en segundo plano o la pantalla apagada, el juego casi se detiene (5 fps, a una sexta parte de la velocidad) en vez de seguir a 30 fps. Al volver, está donde lo dejaste.

- El límite de FPS de serie en Android es 60 (antes era ilimitado y dibujaba fotogramas que la pantalla tiraba).
- La pantalla se pone a la frecuencia del juego: la del Thor, de 120 Hz, pasa a 60 Hz mientras juegas (si el panel puede cambiar sin parpadeo).
- Las escenas en pausa y los vídeos van a 30 fps.
- Se arregló un fallo que recreaba la swapchain en cada fotograma.
- El panel de la pantalla de abajo solo se anima en la pestaña Mapa; en las demás, con ☾ o en segundo plano, ni dibuja ni pide datos al juego.

En el log, la línea `[perf]` dice el estado térmico y si el ahorro está actuando (`power auto, capped 30`).

## Segunda pantalla (AYN Thor y consolas de doble pantalla)

Si la consola tiene una segunda pantalla, re:Blue abre en ella un panel táctil en vivo con el aspecto del menú del campamento del juego. Los gráficos son los del propio juego: ventanas, cursor, caras, barras de PS/PM, iconos de clase y de estado, la flecha del mapa… Se leen en el móvil de tu juego instalado, así que el APK no lleva arte del juego. Los textos en español son los del juego («Estado», «Sombra», «Maestro de espada», «PS», «NV», «RG», «PH», «Oro»…).

A la izquierda está la columna de comandos, como en el menú del juego:

- **Estado:** las fichas de los cinco personajes, como en el menú: cara, NV, PS/PM con sus barras, clase de sombra con su rango, estados alterados y la estrella del líder. Debajo, los accesorios del personaje que toques.
- **Sombra:** las nueve clases de sombra del personaje elegido, con su rango (RG) y puntos de habilidad (PH). La clase equipada va marcada y las que aún no tiene salen apagadas.
- **Objetos:** la bolsa, con los nombres del juego.
- **Mapa:** un mapa normal de la zona, como la pantalla de mapa del juego: el piso entero, fijo y ajustado a la ventana (es la textura del minimapa que el juego tiene cargada), con tu flecha y lo que queda por encontrar (cofres, puntos de búsqueda, barreras…). Debajo está el recuento. ＋ acerca y sigue a tu personaje; － vuelve a la vista entera.
- **Combate:** aparece solo durante las batallas y se abre sola. Muestra la vida de los enemigos y las fichas del grupo, con el cursor en quien tiene el turno.

El panel no toca los controles: se juega con los botones de la consola. ☾ apaga la pantalla de abajo (negro) y ⚙ tiene el idioma, la vibración y el cambio automático a Combate. «Apagar panel» lo quita hasta que vuelvas a abrir el juego.

Rendimiento: el juego solo lee su estado mientras el panel lo está pidiendo. Sin segunda pantalla, con ☾ o con el panel apagado, deja de hacerlo al segundo y medio. El mapa se dibuja una vez por piso; al moverte solo se redibuja la flecha.

Lo que hay que comprobar en la consola la primera vez:

- **Mapa:** la colocación y la flecha usan las fórmulas del mapa de zona del port (`local_map.cpp`), pero no se han visto en la consola. Donde el juego no tenga minimapa, el mapa muestra solo los marcadores alrededor de tu posición.
- **Enemigos:** el port no tiene sus nombres, así que salen como «Enemigo A», «Jefe A»…

El código está en `reblue/src/platform/android_companion.cpp` (lee el estado en el hilo del juego cada pocos fotogramas, solo mientras el panel lo pide, y copia la textura del minimapa cuando cambia de piso), `reblue/src/platform/android_companion_tex.cpp` (pasa texturas de Xbox 360 a PNG), `android/.../DualScreenCompanion.java` (la ventana de la segunda pantalla) y `android/app/src/main/assets/companion/` (el panel). Sin el juego, el panel usa datos de ejemplo (`?mode=field`, `?mode=battle`, `?mode=title`) y, si no encuentra los gráficos, dibuja ventanas sencillas.

## Cómo se traduce el código del juego

El código PowerPC de la Xbox 360 se traduce a C++ (`rexglue codegen`) y el NDK lo compila a ARM64. En Android hay tres ajustes sobre ese código que lo hacen más ligero, sobre todo en móviles con núcleos pequeños (Cortex-A53/A55):

- **Llamadas directas entre funciones del juego.** `libreblue.so` es una librería compartida y las ~17 000 funciones traducidas eran símbolos públicos, así que cada llamada de una a otra pasaba por la PLT: leer la dirección de una tabla y hacer un salto indirecto. Ahora son ocultas y cada llamada es un `bl` directo. Las llamadas por la PLT pasaron de 170 573 a 75 517 (las que quedan son sobre todo de registro de errores, que casi nunca se ejecutan) y los símbolos dinámicos de 42 519 a 4 943, así que la librería también carga antes.
- **Vectores (VMX) sin tablas modificables.** Cada `lvx`/`stvx` da la vuelta a los bytes con una tabla (`VectorMaskL`). Como era una variable modificable, el compilador tenía que leer su dirección de la GOT, cargarla y aplicarle una máscara en cada uso. Ahora es constante y queda en una sola carga desde el propio código: tres instrucciones menos y una lectura dependiente menos por acceso vectorial (cerca de 65 000 sitios).
- **Sin protector de pila ni marco por función** en el código traducido: no tiene búferes que proteger y el desenrollado usa `.eh_frame`. Las funciones con marco pasaron de 18 955 a 8 108.

En total, el código máquina (`.text`) bajó de 20,6 MB a 19,75 MB (−4 %, mejor para la caché de instrucciones) y el APK de 40 a 35 MB. Se sigue compilando para `armv8-a` básico, así que funciona en cualquier ARM64.

Para comparar dos compilaciones: `bash scripts/compare_libs.sh antes.so despues.so`.

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
