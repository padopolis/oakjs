/* Copyright (c) 2010-2014  Padopolis Inc.  MIT License, see: http://opensource.org/licenses/MIT */

//
//	Generic viewer for 2-level tree-like collection:
//		- the first level is an array of 'parent' items
//			- each of which has a 'children' array of 'child' items
//
//	If you want to remember the open state of items in the list, set `rememberOpenStates` to true.
//
//  NOTE: WE ASSUME THE DATA IS ALWAYS SORTED PROPERLY!!!	(TODO: sort before drawing?)
//

Module.define("oak/lib/ui/TreeViewer",
"oak/lib/ui/CollectionListViewer",
function(CollectionListViewer) {

	new Class("TreeViewer", CollectionListViewer, {
		// map of item id to item, initialized in getHTMLForItems()
		itemMap : undefined,

		// if true, we can select parent rows.  If not, we can only open/close parents.
		canSelectParents : false,

		// name of the key on our items (eg: "brandId")
		keyProperty 		: undefined,

		// name of the poperty on parent which lists the children (eg: "issues")
		childrenKeyProperty : undefined,

		// if `true`, we'll output parents without children.
		showEmptyParents 	: true,

		// if `true`, we'll remember the open state of each parent across page reloads
		rememberOpenStates : true,

		// watch for double-click to select
		watchForDoubleClick : true,

		// template for the group that surrounds each parent and its children.
		groupTemplate :  "<div class='group {{openClass}}' key='{{key}}'>{{itemsHTML}}</div>",

		// template for each parent 'row'.
		parentItemTemplate :  "<div class='item parent' key='{{key}}'>{{item.title}}</div>",

		// template for each child 'row'.
		childItemTemplate :  "<div class='item child' key='{{key}}'>{{item.title}}</div>",

		parts : {
			$items		: "LIVE:## .item",
			$groups		: "LIVE:## .group",
		},

		// Given an item in our list, return its corresponding $item.
		// Returns `undefined` if we can't find the $item.
		// NOTE: you'll likely need to override this.
		itemKeySelector : "[key='{{key}}']",
		get$itemForItem : function(item) {
			if (!item) return undefined;
			var key = item[this.keyProperty];
			var keySelector = this.itemKeySelector.expand({key:key});
			var $item = this.$items.filter(keySelector);
			if ($item.length === 0) return undefined;
			return $item.first();
		},

		// Open states of groups.  Set `rememberOpenStates` to `true` to retain across page loads.
		openStates : Property({
			get : function() {
				if (this.rememberOpenStates) return this.preference("openStates") || [];
				return [];
			},

			set : function(newList) {
				if (this.rememberOpenStates) this.preference("openStates", newList);
			}
		}),

		onShown : function() {
			if (this.$okButton) this.$okButton.addClass("disabled");
			this.asCollectionListViewer("onShown");
		},

	//
	//  event handling
	//

		events : [
			{ selector:"$groups", event:"click", handler:"onGroupClicked" },
		],

		getItemForEvent : function(event, $item) {
			var key = $item.attr("key");
			return this.itemMap[key];
		},

		// Click on the group toggles the group open/closed.
		//	On close, if a child of the group was selected, update selection.
		onGroupClicked : function(event, $group) {
			if (event) event.stop();
			this.toggleGroup($group);
		},

		toggleGroup : function($group, groupIsOpen) {
			if (groupIsOpen == null) {
				groupIsOpen = !($group.toggleClass("closed").hasClass("closed"));
			} else {
				$group.toggleClass("closed", !groupIsOpen);
			}

			// remember open state of this item if we're supposed to
			var groupKey = $group.attr("key");
			if (this.rememberOpenStates) {
				var openStates = this.openStates;
				if (groupIsOpen) {
					if (!openStates.contains(groupKey)) openStates.add(groupKey);
				} else {
					openStates.remove(groupKey);
				}
				this.openStates = openStates;
			}

			// update selection if we closed over the selected item
			if (!groupIsOpen && this.selectedItem) {
				var selectedKey = this.selectedItem[this.keyProperty];

				// get the keys for all of the children of the group
				var groupKeys = $group.children().map(function(index, element) { return $(element).attr("key") });

				// parent is the first item in the group
				var parentKey = groupKeys[0];

				// if we can select parents, and the parent was selected, no need to change selection
				if (this.canSelectParents && selectedKey === parentKey) {
					// selection is ok
				} else if (this.canSelectParents) {
					// select the parent
					this.select(parentKey);
				} else {
					this.select(null);
				}
			}
		},

		// Allow them to select by string id as well.
		// NOTE: only works after the initial draw.
		select : function(item, $item) {
			if (typeof item === "string" && this.itemMap) {
				item = this.itemMap[item];
			}

			if ($item) {
				var isParent = $item.hasClass("parent");
				if (isParent && !this.canSelectParents) {
					return this.asCollectionListViewer("select", [null, null]);
				}
			}
			return this.asCollectionListViewer("select");
		},

		markSelectedItem : function($item) {
			// make sure our parent is open
			if (this.selectedItem) {
				if (!$item) $item = this.get$itemForItem(this.selectedItem);
				if ($item) {
					var $group = this.get$groupForItem($item);
					if ($group.hasClass("closed")) this.toggleGroup($group, true);
				}
			}
			this.asCollectionListViewer("markSelectedItem", [$item]);
		},


		// Given a $parent or $child item, return the $group it belongs to.
		// NOTE: not well defined if $item is not actually a child!
		get$groupForItem : function($item) {
			if (!$item) return undefined;
			while (!$item.hasClass("group")) {
				if ($item.length == 0 || $item[0] == this.$root[0]) return undefined;
				$item = $item.parent();
			}
			return $item;
		},



	//
	//	drawing
	//

		// html for the body
		getHTMLForItems : function(items) {
			if (!items) items = this.items;
			if (!items) return "";

			if (!items.forEach) {
				console.warn(this,".getHTML(): items has no forEach method!");
				return "";
			}
			if (items.length === 0) return "";

			// make a map of items and $items, indexed by id
			this.itemMap = {};

			var openStates = this.openStates;
			var html = [], groupItems, lastParent;
			items.forEach(function(item, index) {
				if (!item) return;

				var parentKey = item[this.keyProperty];
				var children = item[this.childrenKeyProperty];
				if ((!children || children.length === 0) && !this.showEmptyParents) return;

				this.itemMap[parentKey] = item;

				var itemsHTML = [];
				itemsHTML.append(this.getParentItemHTML(item, parentKey));
				children.forEach(function(child, index) {
					if (!child) return;
					var childKey = child[this.keyProperty];
					itemsHTML.append( this.getChildItemHTML(child, childKey) );
					this.itemMap[childKey] = child;
			}, this);

				html.append(this.getGroupHTML(itemsHTML, parentKey, openStates.contains(parentKey)));
			}, this);

			return html.join("\n");
		},

		// return HTML for a group.  `itemsHTML` is the HTML for all items in the group.
		getGroupHTML : function(itemsHTML, parentKey, isOpen) {
			if (itemsHTML && itemsHTML.join) itemsHTML = itemsHTML.join("\n");
			if (!itemsHTML) return "";
			var subs = {
				key 		: parentKey,
				itemsHTML	: itemsHTML,
				openClass	: (isOpen ? "" : "closed")
			};
			return this.groupTemplate.expand(subs);
		},

		// Return the HTML for a parent 'row'.
		getParentItemHTML : function(item, key) {
			var subs = {
				viewer 		: this,
				key			: key,
				item 		: item,
			}
			return this.parentItemTemplate.expand(subs);
		},

		// Return the HTML for a child 'row'.
		getChildItemHTML : function(item, key) {
			var subs = {
				viewer 		: this,
				key			: key,
				item 		: item,
			}
			return this.childItemTemplate.expand(subs);
		},


	});	// end new Class("TreeViewer")

	return Class.TreeViewer;
});
