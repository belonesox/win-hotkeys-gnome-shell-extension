const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
const Tweener = imports.ui.tweener;
const GLib = imports.gi.GLib;
const St = imports.gi.St;
const Lang = imports.lang;
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;

const Self = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Self.imports.convenience;
const Settings = Convenience.getSettings();

let desktopShown = false;
let lastActiveWindow;
let panelButton;
let corner;

function _spawn() {
    return GLib.spawn_async(null, arguments, null, 0, null);
}

function _getWindowsList() {
    var rawWindowList = global.screen.get_active_workspace().list_windows();

    var cleanWindowList = [];

    rawWindowList.forEach(
        function(win) {
            if(win.get_window_type() != Meta.WindowType.DESKTOP &&
               win.get_window_type() != Meta.WindowType.DOCK)
                cleanWindowList.push(win);
        });

    return cleanWindowList;
}

function _getActiveWindow() {
    let activeWindow;
    _getWindowsList().forEach(
        function(win) {
            if(win.has_focus())
                activeWindow = win;
        });

    return activeWindow;
}

function _showDesktop() {
    let windows = _getWindowsList();

    if(desktopShown) {
        windows.forEach(
            function(win) {
                win.unminimize(global.get_current_time());
            });
        if(lastActiveWindow)
            lastActiveWindow.activate(global.get_current_time());
    } else {
        lastActiveWindow = _getActiveWindow();
        windows.forEach(
            function(win) {
                win.minimize(global.get_current_time());
            });
    }

    desktopShown = ! desktopShown;
}

function _minimizeAllWindows() {
    let windows = _getWindowsList();

    windows.forEach(
        function(win) {
            win.minimize(global.get_current_time());
        });
}

function _minimizeAllExceptActiveWindow() {
    let windows = _getWindowsList();

    windows.forEach(
        function(win) {
            if(! win.has_focus()) {
                win.minimize(global.get_current_time());
            }
        });
}

function _maximizeVerticalyWindow() {
    let win = _getActiveWindow();
    if(win)
        win.maximize(2, global.get_current_time());
}

function _moveWindowToPreviousScreen() {
    let win = _getActiveWindow();
    let winMonitor = win.get_monitor();
    let totalMonitors = global.screen.get_n_monitors();
    let newMonitor = 0;

    if(winMonitor == 0)
        newMonitor = totalMonitors - 1;
    else
        newMonitor = winMonitor - 1;

    win.move_to_monitor(newMonitor);
}

function _moveWindowToNextScreen() {
    let win = _getActiveWindow();
    let winMonitor = win.get_monitor();
    let totalMonitors = global.screen.get_n_monitors();
    let newMonitor = 0;

    if(winMonitor + 1 == totalMonitors)
        newMonitor = 0;
    else
        newMonitor = winMonitor + 1;

    win.move_to_monitor(newMonitor);
}

function _createHotkeyHandler(name) {
    //global.log("_createHotkeyHandler called: " + name);

    return function() {
        if(name == "open-nautilus") {
            _spawn("/usr/bin/nautilus", "-w");
        } else if(name == "open-search") {
            Main.overview.show();
        } else if(name == "lock-screen") {
            Main.screenShield.lock(true);
        } else if(name == "open-run-dialog") {
            Main.runDialog.open();
        } else if(name == "open-gcc") {
            //GLib.spawn_async(null, ["/usr/bin/gnome-control-center"], null, 0, null);
            _spawn("/usr/bin/gnome-control-center");
        } else if(name == "open-gsm") {
            //GLib.spawn_async(null, ["/usr/bin/gnome-system-monitor", "-p"], null, 0, null);
            _spawn("/usr/bin/gnome-system-monitor", "-p");
        } else if(name == "show-desktop") {
            _showDesktop();
        } else if(name == "minimize-all-windows") {
            _minimizeAllWindows();
        } else if(name == "minimize-all-except-active-window") {
            _minimizeAllExceptActiveWindow();
        } else if(name == "maximize-verticaly-window") {
            _maximizeVerticalyWindow();
        } else if(name == "move-window-to-previous-screen") {
            _moveWindowToPreviousScreen();
        } else if(name == "move-window-to-next-screen") {
            _moveWindowToNextScreen();
        }
    }
}

const ShowDesktopCorner = new Lang.Class({
    Name: 'ShowDesktopCorner',

    _init: function() {
        let monRect = global.screen.get_monitor_geometry(global.screen.get_primary_monitor());

	this._corner = new Clutter.Rectangle({ name: 'show-desktop-corner',
                                               width: 2,
                                               height: 2,
                                               opacity: 0,
                                               reactive: true });

        Main.layoutManager.addChrome(this._corner);

        this._corner.set_position(monRect.x + monRect.width - this._corner.width, monRect.y);

        this._corner.connect('button-press-event', Lang.bind(this, this._onCornerPressed));
    },
    
    _onCornerPressed: function(actor, event) {
        //global.log("Corner._onCornerPressed called");
        _showDesktop();
        return true;
    },

    destroy: function() {
        this._corner.destroy();
    }
});

function init() {
    global.log("11111111!!!!!!!!!!!");
    Settings = Convenience.getSettings();

    panelButton = new St.Bin({ style_class: 'panel-button',
                               reactive: true,
                               can_focus: true,
                               x_fill: true,
                               y_fill: false,
                               track_hover: true });

    let icon = new St.Icon({ gicon: new Gio.ThemedIcon({ name: 'desktop' }),
                             style_class: 'system-status-icon' });

    panelButton.set_child(icon);
    panelButton.connect('button-press-event', _showDesktop);

}

function enable() {
    var mode_normal;
    try{
        // For GNOME Shell version >= 3.16
        mode_normal = Shell.ActionMode.NORMAL;
    }     
    catch(err) {
        // For GNOME Shell version < 3.16
        mode_normal = Shell.KeyBindingMode.NORMAL;
    }
    
    
    global.display.add_keybinding('open-nautilus', Settings, Meta.KeyBindingFlags.NONE, _createHotkeyHandler('open-nautilus'));
	Main.wm.setCustomKeybindingHandler('open-nautilus', mode_normal, _createHotkeyHandler('open-nautilus'));

    global.display.add_keybinding('open-search', Settings, Meta.KeyBindingFlags.NONE, _createHotkeyHandler('open-search'));
	Main.wm.setCustomKeybindingHandler('open-search', mode_normal, _createHotkeyHandler('open-search'));

    global.display.add_keybinding('lock-screen', Settings, Meta.KeyBindingFlags.NONE, _createHotkeyHandler('lock-screen'));
	Main.wm.setCustomKeybindingHandler('lock-screen', mode_normal, _createHotkeyHandler('lock-screen'));

    global.display.add_keybinding('open-run-dialog', Settings, Meta.KeyBindingFlags.NONE, _createHotkeyHandler('open-run-dialog'));
	Main.wm.setCustomKeybindingHandler('open-run-dialog', mode_normal, _createHotkeyHandler('open-run-dialog'));

    global.display.add_keybinding('open-gcc', Settings, Meta.KeyBindingFlags.NONE, _createHotkeyHandler('open-gcc'));
	Main.wm.setCustomKeybindingHandler('open-gcc', mode_normal, _createHotkeyHandler('open-gcc'));

    global.display.add_keybinding('open-gsm', Settings, Meta.KeyBindingFlags.NONE, _createHotkeyHandler('open-gsm'));
	Main.wm.setCustomKeybindingHandler('open-gsm', mode_normal, _createHotkeyHandler('open-gsm'));

    global.display.add_keybinding('show-desktop-now', Settings, Meta.KeyBindingFlags.NONE, _createHotkeyHandler('show-desktop'));
	Main.wm.setCustomKeybindingHandler('show-desktop-now', mode_normal, _createHotkeyHandler('show-desktop'));

    global.display.add_keybinding('minimize-all-windows', Settings, Meta.KeyBindingFlags.NONE, _createHotkeyHandler('minimize-all-windows'));
	Main.wm.setCustomKeybindingHandler('minimize-all-windows', mode_normal, _createHotkeyHandler('minimize-all-windows'));

    global.display.add_keybinding('minimize-all-except-active-window', Settings, Meta.KeyBindingFlags.NONE, _createHotkeyHandler('minimize-all-except-active-window'));
	Main.wm.setCustomKeybindingHandler('minimize-all-except-active-window', mode_normal, _createHotkeyHandler('minimize-all-except-active-window'));

    global.display.add_keybinding('maximize-verticaly-window', Settings, Meta.KeyBindingFlags.NONE, _createHotkeyHandler('maximize-verticaly-window'));
	Main.wm.setCustomKeybindingHandler('maximize-verticaly-window', mode_normal, _createHotkeyHandler('maximize-verticaly-window'));

    global.display.add_keybinding('move-window-to-previous-screen', Settings, Meta.KeyBindingFlags.NONE, _createHotkeyHandler('move-window-to-previous-screen'));
	Main.wm.setCustomKeybindingHandler('move-window-to-previous-screen', mode_normal, _createHotkeyHandler('move-window-to-previous-screen'));

    global.display.add_keybinding('move-window-to-next-screen', Settings, Meta.KeyBindingFlags.NONE, _createHotkeyHandler('move-window-to-next-screen'));
	Main.wm.setCustomKeybindingHandler('move-window-to-next-screen', mode_normal, _createHotkeyHandler('move-window-to-next-screen'));

    Main.panel._rightBox.insert_child_at_index(panelButton, Main.panel._rightBox.get_n_children());

    corner = new ShowDesktopCorner();
}

function disable() {
    global.display.remove_keybinding('open-nautilus');
    global.display.remove_keybinding('open-search');
    global.display.remove_keybinding('lock-screen');
    global.display.remove_keybinding('open-run-dialog');
    global.display.remove_keybinding('open-gcc');
    global.display.remove_keybinding('open-gsm');
    global.display.remove_keybinding('show-desktop-now');
    global.display.remove_keybinding('minimize-all-windows');
    global.display.remove_keybinding('minimize-all-except-active-window');
    global.display.remove_keybinding('maximize-verticaly-window');
    global.display.remove_keybinding('move-window-to-previous-screen');
    global.display.remove_keybinding('move-window-to-next-screen');

    Main.panel._rightBox.remove_child(panelButton);

    corner.destroy();
    corner = null;
}
