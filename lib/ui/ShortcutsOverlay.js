/* Copyright (c) 2010-2014  Padopolis Inc.  MIT License, see: http://opensource.org/licenses/MIT */


/*
	Display a little window with all of the keyboard shortcuts currently in play.
*/

Module.define("oak/lib/ui/ShortcutsOverlay",
"oak/lib/ui/UI,oak/lib/ui/Panel,oak/lib/ui/Modal,oak/lib/ui/KeyMap",
function(UI, Panel, Modal, KeyMap) {

	// Shortcuts overlay singleton
	var ShortcutsOverlay = new Panel({
		id : "ShortcutsOverlay",
		mixins : "Modal",
		title : "Keyboard Shortcuts",
		scrollBody 		: true,
		showingClosebox	: true,

		SEPARATOR_TEMPLATE 	: "<tr><td class='separator' colspan='2'><hr></td></tr>",
		ACTION_TEMPLATE		: "<tr><td class='hint'>{{hint}}</td><td class='key'>{{shortcutTitleString}}</td></tr>",
		updateContents : function() {
			var html = ["<table class='shortcuts'>",
//							"<tr><th class='hint'>Undoable</th><th class='key'>HotKey</th></tr>"
			];
			var outputAction = this.addActionHTML.bind(this, html);
			UI.keyMaps.forEach(function(keyMap, index) {
				// special case for AppMenu to go through each of the visible menus
				if (keyMap.scope === Class.AppMenu) {
					Class.AppMenu.visibleMenus.forEach(function(menu) {
						menu.actions.forEach(outputAction);
					}, this);
					this.addSeparatorHTML(html);
				} else {
					keyMap.actions.forEach(outputAction);
					this.addSeparatorHTML(html);
				}
			}, this);

			// remove the last item if it's a separator
			if (html.last() === this.SEPARATOR_TEMPLATE) html.splice(html.length-1, 1);

			html.push("</table>");
			html = html.join("\n");
			this.$body.html(html);
		},
		addActionHTML : function(html, action) {
			if (!action.visible) return;

			if (action === KeyMap.SEPARATOR) {
				if (html.last() !== this.SEPARATOR_TEMPLATE) html.append(this.SEPARATOR_TEMPLATE);
			} else {
				if (action.keys) html.append(this.ACTION_TEMPLATE.expand(action));
			}
		},
		addSeparatorHTML : function(html) {
			if (html.last() !== this.SEPARATOR_TEMPLATE) html.append(this.SEPARATOR_TEMPLATE);
		}
	}).draw();

	return ShortcutsOverlay;
});	// end define("oak/lib/ui/ShortcutsOverlay")
