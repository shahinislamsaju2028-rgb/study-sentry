use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

#[derive(Clone, Default)]
pub struct AudioWarningGuard {
    enforced: Arc<AtomicBool>,
}

impl AudioWarningGuard {
    pub fn set_enforced(&self, active: bool) {
        self.enforced.store(active, Ordering::SeqCst);
        if active {
            force_system_unmute_and_max_volume();
        }
    }

    pub fn is_enforced(&self) -> bool {
        self.enforced.load(Ordering::SeqCst)
    }

    pub fn spawn_enforcer(&self, quitting: Arc<AtomicBool>) {
        let enforced = self.enforced.clone();
        std::thread::spawn(move || {
            #[cfg(target_os = "windows")]
            win32_audio::init_thread_com();

            while !quitting.load(Ordering::SeqCst) {
                if enforced.load(Ordering::SeqCst) {
                    force_system_unmute_and_max_volume();
                    std::thread::sleep(Duration::from_millis(160));
                } else {
                    std::thread::sleep(Duration::from_millis(320));
                }
            }

            #[cfg(target_os = "windows")]
            win32_audio::uninit_thread_com();
        });
    }
}

pub fn force_system_unmute_and_max_volume() {
    #[cfg(target_os = "windows")]
    win32_audio::enforce_max_endpoint_volume();
}

#[cfg(target_os = "windows")]
mod win32_audio {
    use std::ffi::c_void;
    use std::ptr::{null, null_mut};

    type HRESULT = i32;
    type ULONG = u32;
    type DWORD = u32;
    type BOOL = i32;

    const COINIT_MULTITHREADED: DWORD = 0x0;
    const CLSCTX_ALL: DWORD = 23;
    const E_RENDER: u32 = 0;
    const E_CONSOLE: u32 = 0;
    const E_MULTIMEDIA: u32 = 1;

    #[repr(C)]
    #[derive(Clone, Copy)]
    struct GUID {
        data1: u32,
        data2: u16,
        data3: u16,
        data4: [u8; 8],
    }

    const CLSID_MMDEVICE_ENUMERATOR: GUID = GUID {
        data1: 0xBCDE0395,
        data2: 0xE52F,
        data3: 0x467C,
        data4: [0x8E, 0x3D, 0xC4, 0x57, 0x92, 0x91, 0x69, 0x2E],
    };

    const IID_IMMDEVICE_ENUMERATOR: GUID = GUID {
        data1: 0xA95664D2,
        data2: 0x9614,
        data3: 0x4F35,
        data4: [0xA7, 0x46, 0xDE, 0x8D, 0xB6, 0x36, 0x17, 0xE6],
    };

    const IID_IAUDIO_ENDPOINT_VOLUME: GUID = GUID {
        data1: 0x5CDF2C82,
        data2: 0x841E,
        data3: 0x4546,
        data4: [0x97, 0x22, 0x0C, 0xF7, 0x40, 0x78, 0x22, 0x9A],
    };

    #[repr(C)]
    struct IMMDeviceEnumeratorVtbl {
        query_interface: usize,
        add_ref: usize,
        release: unsafe extern "system" fn(*mut IMMDeviceEnumerator) -> ULONG,
        enum_audio_endpoints: usize,
        get_default_audio_endpoint: unsafe extern "system" fn(
            *mut IMMDeviceEnumerator,
            u32,
            u32,
            *mut *mut IMMDevice,
        ) -> HRESULT,
    }

    #[repr(C)]
    struct IMMDeviceEnumerator {
        vtbl: *const IMMDeviceEnumeratorVtbl,
    }

    #[repr(C)]
    struct IMMDeviceVtbl {
        query_interface: usize,
        add_ref: usize,
        release: unsafe extern "system" fn(*mut IMMDevice) -> ULONG,
        activate: unsafe extern "system" fn(
            *mut IMMDevice,
            *const GUID,
            DWORD,
            *const c_void,
            *mut *mut c_void,
        ) -> HRESULT,
    }

    #[repr(C)]
    struct IMMDevice {
        vtbl: *const IMMDeviceVtbl,
    }

    #[repr(C)]
    struct IAudioEndpointVolumeVtbl {
        query_interface: usize,
        add_ref: usize,
        release: unsafe extern "system" fn(*mut IAudioEndpointVolume) -> ULONG,
        register_control_change_notify: usize,
        unregister_control_change_notify: usize,
        get_channel_count: usize,
        set_master_volume_level: usize,
        set_master_volume_level_scalar:
            unsafe extern "system" fn(*mut IAudioEndpointVolume, f32, *const GUID) -> HRESULT,
        get_master_volume_level: usize,
        get_master_volume_level_scalar:
            unsafe extern "system" fn(*mut IAudioEndpointVolume, *mut f32) -> HRESULT,
        set_channel_volume_level: usize,
        set_channel_volume_level_scalar: usize,
        get_channel_volume_level: usize,
        get_channel_volume_level_scalar: usize,
        set_mute: unsafe extern "system" fn(*mut IAudioEndpointVolume, BOOL, *const GUID) -> HRESULT,
        get_mute: unsafe extern "system" fn(*mut IAudioEndpointVolume, *mut BOOL) -> HRESULT,
    }

    #[repr(C)]
    struct IAudioEndpointVolume {
        vtbl: *const IAudioEndpointVolumeVtbl,
    }

    #[link(name = "ole32")]
    extern "system" {
        fn CoInitializeEx(pv_reserved: *const c_void, dw_co_init: DWORD) -> HRESULT;
        fn CoUninitialize();
        fn CoCreateInstance(
            rclsid: *const GUID,
            p_unk_outer: *mut c_void,
            dw_cls_context: DWORD,
            riid: *const GUID,
            ppv: *mut *mut c_void,
        ) -> HRESULT;
    }

    #[link(name = "winmm")]
    extern "system" {
        fn waveOutSetVolume(hwo: usize, dw_volume: DWORD) -> u32;
    }

    pub fn init_thread_com() {
        unsafe {
            let _ = CoInitializeEx(null(), COINIT_MULTITHREADED);
        }
    }

    pub fn uninit_thread_com() {
        unsafe {
            CoUninitialize();
        }
    }

    unsafe fn enforce_role_endpoint(enumerator: *mut IMMDeviceEnumerator, role: u32) {
        let mut device: *mut IMMDevice = null_mut();
        let hr = ((*(*enumerator).vtbl).get_default_audio_endpoint)(
            enumerator,
            E_RENDER,
            role,
            &mut device,
        );
        if hr < 0 || device.is_null() {
            return;
        }

        let mut ep_void: *mut c_void = null_mut();
        let hr_act = ((*(*device).vtbl).activate)(
            device,
            &IID_IAUDIO_ENDPOINT_VOLUME,
            CLSCTX_ALL,
            null(),
            &mut ep_void,
        );
        if hr_act >= 0 && !ep_void.is_null() {
            let ep = ep_void as *mut IAudioEndpointVolume;

            let mut muted: BOOL = 0;
            if ((*(*ep).vtbl).get_mute)(ep, &mut muted) >= 0 && muted != 0 {
                let _ = ((*(*ep).vtbl).set_mute)(ep, 0, null());
            }

            let mut scalar: f32 = 1.0;
            if ((*(*ep).vtbl).get_master_volume_level_scalar)(ep, &mut scalar) >= 0
                && scalar < 0.99
            {
                let _ = ((*(*ep).vtbl).set_master_volume_level_scalar)(ep, 1.0, null());
            }

            let _ = ((*(*ep).vtbl).release)(ep);
        }

        let _ = ((*(*device).vtbl).release)(device);
    }

    pub fn enforce_max_endpoint_volume() {
        unsafe {
            // Ensure app wave channel is 100% left+right
            let _ = waveOutSetVolume(0, 0xFFFF_FFFF);

            let hr_init = CoInitializeEx(null(), COINIT_MULTITHREADED);
            let should_uninit = hr_init == 0 || hr_init == 1; // S_OK or S_FALSE

            let mut enum_void: *mut c_void = null_mut();
            let hr = CoCreateInstance(
                &CLSID_MMDEVICE_ENUMERATOR,
                null_mut(),
                CLSCTX_ALL,
                &IID_IMMDEVICE_ENUMERATOR,
                &mut enum_void,
            );

            if hr >= 0 && !enum_void.is_null() {
                let enumerator = enum_void as *mut IMMDeviceEnumerator;
                enforce_role_endpoint(enumerator, E_CONSOLE);
                enforce_role_endpoint(enumerator, E_MULTIMEDIA);
                let _ = ((*(*enumerator).vtbl).release)(enumerator);
            }

            if should_uninit {
                CoUninitialize();
            }
        }
    }
}
