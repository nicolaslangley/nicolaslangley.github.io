## Porting to Chrome Native Client (NaCl) ##

#### Overview of Document ####
This document will outline the process of porting a C++ application to Chrome Native Client (NaCl).
The documentation on NaCl can be confusing so I will try to clarify what I have been able to learn about how NaCl works
and what is required to get an application up and running within Chrome.

#### Table of Contents ####

### Setting up a NaCl Project ###
- [Native Client and Portable Native Client](#pnaclvnacl)
- [Native Client Application Structure](#naclappstruct)
- [Visual Studio and Toolchain](#vs_tool)

### Steps in Porting GLBenchmark ###
- [GLBenchmark Application Outline](#glbappoutline)
- [NaCl Messaging](#naclmessage)
- [NaCl Instance and OpenGL Setup](#instance_gl_setup)
- [NaCl Threads and SwapBuffers](#naclthreads)
- [NaCl File I/O](#naclfileio)
- [Asset Management](#assetman)
- [Converting to NaCl Chrome App](#convertchromeapp)
- [Debugging and Logging](#debuglog)

#### <a id="pnaclvnacl"/> Native Client and Portable Native Client ####

As outlined [here](https://developer.chrome.com/native-client/nacl-and-pnacl) there is a distinction made between
Portable Native Client (PNaCl) and Native Client (NaCl). The source code of the module does not vary between the two
(although there are some restrictions in PNaCl) but there there are a number of differences regarding the toolchain.
For this project, I have used the standard [Native Client toolchain](https://developer.chrome.com/native-client/devguide/devcycle/building#the-gnu-based-toolchains)
as (although Google suggests using PNaCl) the PNaCl toolchain is much less stable and less clearly documented.

#### <a id="naclappstruct"/> Native Client Application Structure ####

The structure of a NaCl application involves 4 main components. These are:

- HTML file (`.html`)
- JavaScript file (`.js`)
- NaCl manifest (`.nmf`)
- NaCl module (`.nexe`)

The HTML file and JavaScript file are the entry point to the NaCl module and house traditional web code. The NaCl manifest
file specifies the properties of your module and the NaCl module itself contains your compiled native code in `.nexe` format.

You can get a description of each of these items from Google 
[here](https://developer.chrome.com/native-client/devguide/coding/application-structure). I will detail the composition of
each of these files within the GLBenchmark example:

As explained in the documentation, the HTML file must contain an `<embed>` element that triggers the loading of the 
NaCl module.

The `<embed>` element within the GLBenchmark example (let's just call it GLB) is as follows:
```html
<embed id="glbench_nacl_vs10"
           width=1280 height=720
           src="newlib/glbench_nacl_vs10.nmf"
           type="application/x-nacl" />
```
As you can see, we are specifying the location of the NaCl manifest file as well as specifying that the type of the embed is
`application/x-nacl`. Finally, we outline both the width and height of the area that the NaCl module will manage in the 
webpage.

The NaCl manifest (`.nmf`) file for this project is:
```
{
  "files": {},
  "program": {
    "x86-64": {
      "url": "glbench_nacl_vs10_64.nexe"
    }
  }
}
```
The program component specifies to location of the compiled `.nexe` file for each architecture. In this case, there only
exists one `.nexe` for the 64-bit x86 architecture. A more in-depth look at `.nmf` files can be found 
[here](https://developer.chrome.com/native-client/reference/nacl-manifest-format).

The NaCl module is where all of the native code lives. When compiled we have a `.nexe` file. In order for native code to be
compiled into a NaCl module, there are a number of components that must exist in the code.

- a factory function `CreateModule()`
- a Module class (derived from `pp::Module`)
- an Instance class (derived from `pp::Instance`)

These components are outlined in more depth [here](https://developer.chrome.com/native-client/devguide/coding/application-structure#native-client-modules-a-closer-look).

For GLB, all of the NaCl related code exists in a C++ file called `nacl_main.cpp`.
An outline of this file with these components present is:
```cpp
#include "ppapi/cpp/instance.h"
#include "ppapi/cpp/module.h"


// Instance class that extends pp::Instance
class GLBenchInstance : public pp::Instance {
public:
  explicit GLBenchInstance(PP_Instance instance)
    : pp::Instance(instance) {}

  virtual ~GLBenchInstance() {}

};

// Module class that extends pp::Module
class GLBenchModule : public pp::Module {
public:
  GLBenchModule() : pp::Module() {}
  virtual ~GLBenchModule() {}

  virtual pp::Instance* CreateInstance(PP_Instance instance) {
    return new GLBenchInstance(instance);
  }

};

namespace pp {
  // Factory method for creating module
  Module* CreateModule() {
    return new GLBenchModule();
  }
}
```
The instance created corresponds to the space on the webpage that is managed by the NaCl module. The NaCl module class
is used by the browser to create a module object that is the main binding point between the browser and the NaCl module.
An instance is created by the module whenever there is an `<embed>` element within the webpage that references the module.

#### <a id="vs_tool"/> Visual Studio and Toolchain ####

For developing NaCl applications, there are a couple of different tools available. After downloading the 
[NaCl SDK](https://developer.chrome.com/native-client/sdk/download), you can either:

- Use a `makefile` and build your project manually
- Install Google's provided Visual Studio 2010 plugin

[Here](https://developer.chrome.com/native-client/devguide/devcycle/building) is the provided documentation on building
a Native Client module. It largely focuses on how to build a PNaCl `.pexe` and so will be largely ignored for this section.

**Note:** The Visual Studio plugin does not have stable PNaCl support and I found that the only reliable way
to build a `.pexe` was using makefiles (see the `GLBenchmark_2_7_0/Projects/nacl/PNaCl Make` folder for an example)

The easiest method, and the method I took, was to install and use the Visual Studio 2010 plugin. Documentation on
installing the plugin can be found [here](https://developer.chrome.com/native-client/devguide/devcycle/vs-addin).
An item of note is that the compiled application can only be run in debug mode from within Visual Studio and that a server
must already be running before it can do so (the default is `http://localhost:5103`)

#### <a id="glbappoutline"/> GLBenchmark Application Outline ####

Here is very quick outline of the structure of the GLBenchmark application used in this example. I have tried to gloss over
as many details as possible but some understanding of the structure of the application will hopefully aid in
understanding the porting process.

The GLBenchmark application looks to run a series of tests and measure the performance in order to output results.
With this being the case, the basic application loop consists of the following steps:

1. Setup the GLB application
2. Add a number of tests to be run
3. Select a test
4. Initialize the test and run it
5. Finish the test and output results
6. Continue to run tests until there are none left
7. Close application

The codebase for GLB is composed of an `GLB::Application` class that handles all of the rendering, animation and other
details regarding running a test. This class contains no platform-specific code and does the majority of the work. It
provides the ability to run select, initialize, run and output the results of any specified test.

In addition, for each platform (i.e. Android, OSX, NaCl) that the application supports, there is a platform-specific set of
code that includes the entry to the main loop and the main application loop itself. For the port of GLBenchmark, all of the
`GLB::Application` code was left untouched and a new set of NaCl specific code was added. This code had to encompass all
functionality outside of that provided by `GLB::Application`, namely setting up the application, handling input, initializing
assets and communicating with the user. The directory structure of the GLB project is as follows:

```
GLBenchmark_2_7_0
    - Frameworks
    - Projects
        - NaCl Project (VS, index.html, manifest) - this was modified
        - Android Project
        - Other projects (OSX, iOS, etc.)
    - Source
        - Application
        - Common
        - Platforms
            - NaCl Source (nacl_main.cpp, etc.) - this was modified
            - Android Source
            - Other source (Linux, OSX, iOS, etc.)
```

The porting process involved re-writing the main application loop, entry point and re-using the existing `Common` and
`Application` source as well as the `Frameworks` provided.

#### <a id="naclmessage"/> NaCl Messaging ####

Since Native Client is a component that exists within a webpage, there is a need to communicate between the webpage, 
generally using JavaScript, and the NaCl module. Google provides an interface for doing just that. It is outlined
[here](https://developer.chrome.com/native-client/devguide/coding/message-system).

Within this project, messaging between the NaCl module and the user facing webpage has been used to communicate the user's
choice of test to the NaCl module as well as to communicate the NaCl module's status to be displayed by the webpage.

The relevant messaging function within the NaCl module is:

```cpp
// Handle message sent from JavaScript
virtual void HandleMessage(const pp::Var& var_message) {
  // Ignore the message if it is not a string.
  if (!var_message.is_string())
    return;
  // Convert message to a string
  PostMessage("Message received");
  PostMessage(var_message);
  std::string message_str = var_message.AsString();

  // If the message received is 'Start', then setup the GLB application on application thread
  if (message_str == "Start") 
  {
    glb_app_thread.message_loop().PostWork(m_callback_factory.NewCallback(&GLBenchInstance::SetupGLBApplication)); 
    return;
  }
  // If the message is 'NextTest' tell window that next test command has been started
  else if (message_str == "NextTest")
  {
    PostMessage("Moving to next test");
    // This crashes somewhere down the line
    m_wnd->handle_cmd(1);
  }
  // Set onscreen or offscreen value for trex test
  else if (message_str == "trex_on")
  {
    m_onscreen_test = true;
  }
  else if (message_str == "trex_off")
  {
    m_onscreen_test = false;
  }
}
```

This function processes the message sent from the webpage and parses it to either start the application, move to the next
test or start the default TRex test in onscreen or offscreen mode.

The messaging function within the JavaScript is:

```javascript
// Handle message sent from NaCL module ( using pp::Instance.PostMessage())
// Display to console
function handleMessage(message_event) {
  // Display to console
  console.log(message_event.data);
  // Parse incoming message string and update status with any messages prefixed by 'GLB'
  var newStr = new String(message_event.data);
  if (newStr.charAt(0) == 'G' && newStr.charAt(1) == 'L' && newStr.charAt(2) == 'B') {
    updateStatus(message_event.data);
  } else if (newStr == "ExitModule") {
    // ExitModule message ends NaCl module
    endModule();
  }
}
```

This function logs any output from the NaCl module to the log and calls an `updateStatus()` function if the message is
prefixed by `GLB`.


#### <a id="instance_gl_setup"/> NaCl Instance and OpenGL Setup ####

Now we will look at the intial setup of a NaCl instance as well as how to create a graphics context.
Once a NaCl instance has been created, any initialization code can be done in the `init` function. This function has
the prototype:

```cpp
virtual bool Init(uint32_t argc, const char* argn[], const char* argv[])
```

NaCl does not have allow direct access to the graphics context and in fact, there is no EGL in NaCl. All of the graphics
setup is done using Google's PPAPI using a `pp::Graphics3D` object. In order to create the context and use OpenGL functions,
you must include `ppapi/lib/gl/gles2/gl2ext_ppapi.h` and `ppapi/cpp/graphics_3d.h`. Within the GLB code, in `nacl_main.cpp`
there is an `InitGL` function:

```cpp
// Sets up Context for drawing and makes it available globally
bool InitGL(int32_t new_width, int32_t new_height) {
  // Attempt to initialize OpenGL using PPAPI
  if (!glInitializePPAPI(pp::Module::Get()->get_browser_interface())) 
  {
    PostMessage("Unable to initialize GL PPAPI!);
    return false;
  }

  // Define attributes for graphics context
  const int32_t attrib_list[] = {
    PP_GRAPHICS3DATTRIB_DEPTH_SIZE, 24,
    PP_GRAPHICS3DATTRIB_WIDTH, new_width,
    PP_GRAPHICS3DATTRIB_HEIGHT, new_height,
    PP_GRAPHICS3DATTRIB_NONE
  };

  // Create new context with given attribute list
  m_context = pp::Graphics3D(this, attrib_list);\
  // Set global context to be current context for egllibs
  egllib_context = m_context;
  // Attempt to bind 3d context
  if (!BindGraphics(m_context)) 
  {
    fprintf(stderr, "Unable to bind 3d context!\n");
    m_context = pp::Graphics3D();
    glSetCurrentContextPPAPI(0);
    return false;
  }

  glSetCurrentContextPPAPI(m_context.pp_resource());    

  return true;
}
```

More information about setting up OpenGL in NaCl can be found [here](https://developer.chrome.com/native-client/devguide/coding/3D-graphics)

The fact that there is no EGL present within NaCl (it is obscured by `pp::Graphics3D`) can cause trouble when dealing with
a codebase that uses EGL. In order to handle this problem in the GLB example, I was forced to implement the EGL header and
functions. This involved creating a `include\egl.h` file that specified the following EGL functions:

```cpp
// EGL function prototypes - to be overwritten using NaCl
unsigned int eglGetConfigAttrib(void * display, void * config, unsigned int attribute, int * value);
unsigned int eglGetConfigAttrib(void * display, void * config, unsigned int attribute, unsigned int * value);
unsigned int eglGetConfigs(void * display, void ** configs, unsigned int config_size, unsigned int * num_config);
char const * eglQueryString(void* display, unsigned int name);
```

These were then implemented (without full functionality) in order to not break the existing source code. Full functionality
was not required because `pp::Graphics3D` effectively replaces EGL. The partial implementations are found below:

```cpp
#include <EGL/egl.h>
#include "ppapi/lib/gl/gles2/gl2ext_ppapi.h"
#include "ppapi\cpp\graphics_3d.h"
#include "ppapi\c\ppb_graphics_3d.h"

// Global Graphics3D context to be set to current context by main instance
pp::Graphics3D egllib_context;

// Override EGL functions using NaCl Graphics3D API
// Handle both case where value is unsigned or signed
unsigned int eglGetConfigAttrib(void * display, void * config, unsigned int attribute, unsigned int * value) {
  return eglGetConfigAttrib( display, config, attribute, (int*)value);
}

unsigned int eglGetConfigAttrib(void * display, void * config, unsigned int attribute, int * value) {
  int32_t attrib_list[] = {attribute, 0};
  PP_Resource context = glGetCurrentContextPPAPI();
  int32_t return_value = egllib_context.GetAttribs(attrib_list);
  return (int) return_value;
}

// Does this need to be implemented or can we return dummy information?
unsigned int eglGetConfigs(void * display, void ** configs, unsigned int config_size, unsigned int * num_config) {
  return (int) 0;
}

char const * eglQueryString(    void* display, unsigned int name) {
  return "";
}
```

#### <a id="naclthreads"/> NaCl Threads and SwapBuffers ####

When working with NaCl there are some important things to node when trying to render or perform I/O. Each Chrome tab runs as
it's own process and has it's own main thread. Once a NaCl module is started, it is run in its own, sandboxed, process that
is seperate from the main Chrome process that is associated with each tab. The NaCl module runs it's own main thread as well.
Communication between both the NaCl main thread and the Chrome main thread are handled using PPAPI calls.

This all pertains to rendering 3D graphics because we must use a special function, called from out NaCl thread, in order to
swap buffers in the Chrome main thread in order for anything to be displayed on the screen.

The documentation for this function can be found [here](https://developer.chrome.com/native-client/pepper_stable/c/struct_p_p_b___graphics3_d__1__0#a293c6941c0da084267ffba3954793497)

This function is non-blocking and requires that a callback function is provided. In short, it performs some work on the
Chrome main thread and then once this is complete, it calls the provided callback function on the Native Client thread.
I found that this behaviour makes handling the main render loop much more complicated than it needs to be.

Here is an image (from Google) of the expected communication between the Chrome and NaCl threads:

![](https://developer.chrome.com/native-client/images/3d-graphics-render-loop.png?raw=true)

Let's now look at how I went about handling this issue in the GLB example.

Looking at the main application loop for GLB used in the linux version of GLB we can see that it has the following form:

1. Initialize and create GLB application
2. Loop over list of selected tests
3. Select test and render loading screen
    - Make a call to swapbuffers after rendering loading screen
4. Loop while running current test to render and animate
    - Make a call to swapbuffers for each loop

You can see the full code for the main loop [here](https://gist.github.com/nicolaslangley/eeb6dc8c5411c2ef8782)

The calls to swapbuffer made in the linux version are assumed to be blocking on the main application thread. However,
within the Native Client paradigm, the `pp::Graphics3D::SwapBuffers` call is non-blocking on the Native Client thread.
This requires a revision of the main application loop to accomodate this and involves splitting up the main loop into a
number of functions that can be passed as callback functions to `pp::Graphics3D::SwapBuffers`. The set of functions that
provide analogous functionality to the linux main loop above are:

- `SetupGLBApplication()`
    - Creates graphics context
    - Sets up GLB application and parses application parameters
    - Calls `SetupTests()`
- `SetupTests()`
    - This function handles the setup portion of the main loop
    - Chooses which test to run
    - Renders loading screen
    - Makes a call to `pp::Graphics3D::SwapBuffers` with `InitTest()` as callback
    - If no test is chosen, calls `ExitTests()`
- `InitTest()`
    - Initialize the test within the GLB application
    - Renders running screen
    - Makes a call to `pp::Graphics3D::SwapBuffers` with `RunTest()` as callback
- `RunTest()`
    - Performs animation and rendering of the current test
    - Continually calls `pp::Graphics3D::SwapBuffers` with itself as callback until test is finished
    - This mimics the test loop found in the Linux version
    - When test is finished, calls `EndTest()`
- `EndTest()`
    - Handles finishing up of currently running test
    - Calls `SetupTests()`
- `ExitTest()`
    - Cleans up GLB application
    - Outputs results and exits NaCl module

The source for the above functions can be found [here](https://gist.github.com/nicolaslangley/b0c03840b432c2db3259)

**Note:** All functions passed as callbacks to a function must have `int32_t` as parameter (e.g. `void InitTest(int32_t)`)

The behaviour of `pp::Graphics3D::SwapBuffers` requires the use of multiple functions in place of one contiguous loop in a
traditional main function. For this example, it was possible to make this modification fairly seamlessly, it is something to
consider when looking at applications that may require more complex usage of `pp::Graphics3D::SwapBuffers`.

Rendering isn't the only behaviour within Native Client that requires special care. `pp::Graphics3D::SwapBuffers` is 
non-blocking on the Native Client main thread because you **cannot block** on the main NaCl thread. This leads to a
number of issues when trying to perform some basic tasks (e.g. C style File I/O).

The GLB codebase makes extensive use of blocking calls and so In order to find a way around the restriction of being unable
to block on the main Native Client thread, I had to create a second worker thread that performed all meaningful GLB-related
tasks.

Creating a thread within your NaCl module can be done using the `pp::SimpleThread` class.
To create and start new thread:

```cpp
#include "ppapi/utility/threading/simple_thread.h"
pp::SimpleThread glb_app_thread;
glb_app_thread.Start();
```

To close the thread (in GLB this is in the instance destructor) use `glb_app_thread.Join();`

In order to assign work to the worker thread, you have to use the [`pp::MessageLoop`](https://developer.chrome.com/native-client/pepper_stable/cpp/classpp_1_1_message_loop) 
class to post work to the thread. An example of this is posting the `SetupGLBApplication()` function to be run on the
`glb_app_thread`:

```cpp
glb_app_thread.message_loop().PostWork(m_callback_factory.NewCallback(&GLBenchInstance::SetupGLBApplication));
```

**Note:** In this example, I elected to run the entire GLB application on a worker background thread and only handle basic
communication between the main Native Client thread and the Chrome main thread. This was due to the use of blocking I/O
calls present within the GLB application.

#### <a id="naclfileio"/> NaCl File I/O ####

The previous section offers a nice segue into how File I/O is done in Native Client. There are two distinct facilities
available for performing File I/O. Firstly, you can use the [`pp::FileIO`](https://developer.chrome.com/native-client/pepper_stable/cpp/classpp_1_1_file_i_o)
class to perform non-blocking File I/O within the main Native Client thread. An in depth look into how to use this API is
provided [here](https://developer.chrome.com/native-client/devguide/coding/file-io)

Google also provides the ability to perform traditional blocking I/O by way of the `nacl_io` library. This library provides
access to traditional C-style File I/O (i.e. `fopen`, `fread`, etc.) that allow for the use of more traditional blocking I/O.
An explanation of how this library works is available [here](https://developer.chrome.com/native-client/devguide/coding/nacl_io).
The examples all deal with a C application and setup, so I will detail how I used the library within the GLB application.

In order to setup the `nacl_io` library, you must include both `nacl_io/nacl_io.h` and `sys/mount.h`. We can then
initialize the library by making the following call:

```cpp
nacl_io_init_ppapi(this->pp_instance(), pp::Module::Get()->get_browser_interface());
```

All File I/O within NaCl requires a file system to be active. Since we are operating within the browser, there is no
access to the system file system, but we can use the HTML5 Persistent Storage to read and write files from. In order to use
a file system within NaCl, and `nacl_io` specifically, we must mount the desired file system using `mount`. This is done
as follows:

```cpp
// Unmount default file system and mount persistent HTML5 filesystem
umount("/");
int mount_result = mount("","/persistent","html5fs",0,"type=PERSISTENT,expected_size=1048576");
```

**Note:** while `nacl_io` and the `pp::FileIO` API use the same file system, they are set up differently

Once we have mounted the filesystem and initialized the `nacl_io` library, it is possible to use traditional C-style file I/O
calls throughout the application. The only requirement is that these blocking calls cannot occur on the main Native Client
thread. For details on this see [the threading section](#naclthreads)

#### <a id="assetman"/> Asset Management ####

If the program being ported as a large number of assets required, there are a couple of different options for obtaining them
for use in your Native Client application. If you are able to host the required files on your own webserver, you can use
the NaCl [URLLoader API](https://developer.chrome.com/native-client/pepper_stable/cpp/classpp_1_1_u_r_l_loader) to download
them and save them to the HTML5 persistent storage. Details on how to do this can be found [here](https://developer.chrome.com/native-client/devguide/coding/url-loading)

With the GLB example, I took a different approach. In order to read and write to files, they must be present in the HTML5
persistent file storage that is mounted and used by the `nacl_io` library. Instead of loading and downloading URLs witin the
Native Client module, I instead chose to load the HTML5 persistent filesystem and copy the relevant files within JavaScript
as part of the webpage that hosts the Native Client module.

In order to do this, I relied on the user specifying the location of the relevant asset files on their local machine.

**Note:** After I detail more about how to package the application into a Chrome App, I will show how to bundle the assets
so that no user input is required

Chrome supports the `FileSystem API` (for more see [here](http://www.html5rocks.com/en/tutorials/file/filesystem/)) and this
can be used to read and write files to HTML5 persistent storage.

To present the user with the option of selecting a directory for uploading, you must add an input element to your HTML
document.

```html
<input type="file" id="file_input" webkitdirectory="" directory=""/>
```

After adding a listener to this DOM element we can process the generated event and iterate through the selected files.
The process of iterating through files and copying them from the user's file system to the HTML5 persistent storage requires
a number of steps:

1. Iterate through all of the selected files
2. For each file download the file from the user's file system
3. Create the directory housing the file within HTML5 persistent storage
4. Save the file to HTML5 persistent storage

These steps are done using 4 JavaScript functions

- `handleFileSelect(evt)`
    - Gets list of selected files
    - Calls `handleFile(file)` to handle the first selected file
- `handleFile(file)`
    - If all files have been loaded, update HTML status and end
    - Gets URL for specified file
    - Checks that the file does not already exists in HTML5 persistent storage
    - Calls `downloadFile(url, success)` with `saveFile(blob, path)` as callback
- `downloadFile(url, success)`
    - Create HTTP request for URL
    - Download blob of URL and pass it to success callback
- `saveFile(blob, path)`
    - Splits path of blob into folders and creates them using `createDir(folders)` if they don't exist
    - Create file and write blob to HTML5 persistent storage
    - Call `handleFile(file)` for the next file in list of selected files

The source for these files can be found [here](https://gist.github.com/nicolaslangley/8cecc8294d56d03bab3b)

#### <a id="convertchromeapp"/> Converting to NaCl Chrome App ####

In order to distribute and run your NaCl application outside of the development environment, it is required to package
it as a Chrome Extension (Chrome App).

Here are some useful links from Google about this process:

- [Packaged Apps Overview](https://developer.chrome.com/extensions/apps)
- [Distributing a NaCl App](https://developer.chrome.com/native-client/devguide/distributing)
- [How to Package a Chrome App](https://developer.chrome.com/extensions/packaging)

Here I will outline some of these steps as well as any changes that were required within the source by this process.

The main addition that is required in order to create a packaged Chrome Application is the presence of a `manifest.json`
file that outlines some details about your application. A detailed outline can be found [here](https://developer.chrome.com/extensions/manifest).

The `manifest.json` file that I used was quite simple:

```
{
  "manifest_version": 2,
  "name": "GLBenchmark 2.7.0",
  "version": "1.0",

  "description": "Native Client Version of GLBenchmark",
  "icons": {"128": "icon128.png"},
  
  "minimum_chrome_version": "28",
  "offline_enabled": true,
  
  "permissions": [
    "unlimitedStorage",
    "storage"
  ],
  "app": {
    "launch": {
      "local_path": "index.html",
      "container": "panel"
    }
  }
}
```

The `"container"` property determines if the Chrome App launches in a new tab or it's own window.

The other major change required by using a packaged app was the bundling of assets. In [the previous section](#assetman) I
outlined how assets were copied based on user input. Since all of the data assets are included along with the Chrome App
there is no need for any user input. The previous method was reliant on the `<input>` tag for the list of data files and
there is no way to mimic an `<input>` tag programatically. Inorder to get a list of all of the asset files, I was forced to
generate a textfile with a list of all of the filenames. This could then be loaded and parsed in the JavaScript to form a
list of files. The updated JavaScript code can be found [here](https://gist.github.com/nicolaslangley/e290c1da767ea4056c7c).

Here is a Python script used to generate a text file with all of the filenames stored in the `/data/` directory:

```python
import os
curpath = os.getcwd();

with open("filelist.txt", "w") as a:
    for path, subdirs, files in os.walk(curpath):
       for filename in files:
         relpath = os.path.relpath(path, curpath); 
         if relpath[:4] == "data":
           f = os.path.join(relpath, filename)
           a.write(str(f) + os.linesep)
```

You can then load Chrome and package your application into a `.crx` which can be distributed (see [link](https://developer.chrome.com/extensions/packaging) above) and installed by other Chrome users.

#### <a id="debuglog"/> Debugging and Logging ####

Debugging and logging in Chrome are covered extensively [here](https://developer.chrome.com/native-client/devguide/devcycle/debugging)
but I will go into some detail about a couple of techniques that I used that were helpful in working on the GLB 
example.

The main way of debugging a NaCl app is to use either the included version of `nacl-gdb` that is bundled in the NaCl SDK.
This can be launched within Visual Studio 2010 if the NaCl plugin is installed (see [Visual Studio section](#vs_tool)) or
from the command line by launching Chrome with the `--enable-nacl-debug` flag and then running the `nacl-gdb` executable
found in the NaCl SDK.

This latter process can be made more seamless by loading a script that performs the setup detailed in the linked document
above. This is done by using the `-x` flag with the name of the script as an argument when running nacl-gdb from the command
line.

The script I used was:

```
target remote localhost:4014
nacl-manifest "GLBenchmark_2_7_0\projects\nacl\newlib\glbench_nacl_vs10.nmf"
remote get irt .\irt.nexe
nacl-irt .\irt.nexe
```

Where the `nacl-manifest` location denotes wherever the `.nmf` file is stored

Within the code, and working with OpenGL code specifically, I found that a useful feature of GDB is the ability to
dynamically call global functions while debugging. This is extremely useful for determining the output of `glGetError()` or
`glGetString()` at runtime without having to add unnecessary calls within your code. I simply added the following global
functions:

```cpp
// Global GL functions for debugging
GLenum GetGLError() {
  GLenum error = glGetError();
  return error;
}

const GLubyte* GetGLString() {
  const GLubyte* vendor = glGetString(GL_VENDOR);
  return vendor;
}
```

And used the GDB [`call`](https://sourceware.org/gdb/onlinedocs/gdb/Calling.html) function to retrieve the output while
debugging.

Logging within your Native Client code can be done by redirecting the `stdout` and `stderr` channels or by using the
`PostMessage()` function within your code. However, `PostMessage()` is a member function of the current instance and so in
order to be able to use `PostMessage()` outside of the instance I had to make a global reference to the instance and 
access it in any other class or function to use `PostMessage()`. This is not as trivial as it sounds and requires passing
an ID of the instance as a `PP_Instance` value.

Within the instance class we have to retrieve the `PP_Instance` value:

```cpp
g_instance = this->pp_instance();
```

And within the class that we want to add access to `PostMessage()` in:

```cpp
pp::Instance cur_instance = pp::Instance(g_instance);
cur_instance.PostMessage(...);
```
