// Hides the console window on Windows release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Window stays in tauri.conf.json; create is false so this is the only one.
            // target=_blank is dropped by the webview on macOS and Windows, so open those URLs outside the app.
            let mut config = app.config().app.windows.first().expect("window config").clone();
            // tauri dev loads the local site; release builds keep the url in tauri.conf.json.
            #[cfg(debug_assertions)]
            {
                config.url = tauri::utils::config::WebviewUrl::External(
                    "http://localhost:3000/dashboard".parse().unwrap(),
                );
            }
            tauri::WebviewWindowBuilder::from_config(app, &config)?
                .on_new_window(|url, _features| {
                    open_external(url.as_str());
                    tauri::webview::NewWindowResponse::Deny
                })
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running InterviewPrep");
}

fn open_external(url: &str) {
    if !url.starts_with("https://") || url.chars().any(|c| c.is_whitespace() || c == '"') {
        return;
    }
    #[cfg(target_os = "macos")]
    let _ = std::process::Command::new("open").arg(url).spawn();
    #[cfg(target_os = "windows")]
    let _ = std::process::Command::new("cmd")
        .arg("/C")
        .arg(format!("start \"\" \"{url}\""))
        .spawn();
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let _ = std::process::Command::new("xdg-open").arg(url).spawn();
}
