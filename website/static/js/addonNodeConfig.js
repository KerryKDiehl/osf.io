/**
 * Module that controls the addon node settings. Includes Knockout view-model
 * for syncing data, and HGrid-folderpicker for selecting a folder.
 */
'use strict';

var ko = require('knockout');
require('knockout.punches');
var $ = require('jquery');
var Raven = require('raven-js');

var ZeroClipboard = require('zeroclipboard');
ZeroClipboard.config('/static/vendor/bower_components/zeroclipboard/dist/ZeroClipboard.swf');
var $osf = require('js/osfHelpers');
var oop = require('js/oop');
var FolderPickerViewModel = require('js/folderPickerNodeConfig');

ko.punches.enableAll();

/**
 * View model to support instances of AddonNodeConfig (folder picker widget)
 *
 * @class AddonFolderPickerViewModel
 * @param {String} addonName Full display name of the addon
 * @param {String} url API url to initially fetch settings
 * @param {String} selector CSS selector for containing div
 * @param {String} folderPicker CSS selector for folderPicker div
 * @param {Object} opts Optional overrides to the class' default treebeardOptions, in particular onPickFolder
 */
var AddonFolderPickerViewModel = oop.extend(FolderPickerViewModel, {
    constructor: function(addonName, url, selector, folderPicker, opts) {
        var self = this;
        self.super.constructor.call(self, addonName, url, selector, folderPicker);
        // externalAccounts
        self.accounts = ko.observable([]);
        self.selectedFolderType = ko.pureComputed(function() {
            var userHasAuth = self.userHasAuth();
            var selected = self.selected();
            return (userHasAuth && selected) ? selected.type : '';
        });
        self.messages.submitSettingsSuccess =  ko.pureComputed(function() {
            return 'Successfully linked "' + $osf.htmlEscape(self.folder().name) + '". Go to the <a href="' +
                self.urls().files + '">Files page</a> to view your content.';
        });
        // Overrides
        var defaults = {
            onPickFolder: function(evt, item) {
                evt.preventDefault();
                var name = item.data.path !== '/' ? item.data.path : '/ (Full ' + self.addonName + ')';
                self.selected({
                    name: name,
                    path: item.data.path,
                    id: item.data.id
                });
                return false; // Prevent event propagation
            },
            connectAccount: function() {
                window.location.href = this.urls().auth;
            }
        };
        // Overrides
        self.options = $.extend({}, defaults, opts);
        // Treebeard config
        self.treebeardOptions = $.extend(
            {}, 
            FolderPickerViewModel.prototype.treebeardOptions,
            {
                onPickFolder: function(evt, item) {
                    return this.options.onPickFolder.call(this, evt, item);
                }.bind(this),
                resolveLazyloadUrl: function(item) {
                    return item.data.urls.folders;
                }
            }
        );
    },
    _updateCustomFields: function(settings){
        this.validCredentials(settings.validCredentials);
    },
    /**
     * Allows a user to create an access token from the nodeSettings page
     */
    connectAccount: function() {
        this.options.connectAccount.call(this);
    }
});

// Public API
function AddonNodeConfig(addonName, selector, url, folderPicker, opts) {
    var self = this;
    self.url = url;
    self.folderPicker = folderPicker;
    if (typeof opts === 'undefined') {
        opts = {};
    }
    self.viewModel = new AddonFolderPickerViewModel(addonName, url, selector, folderPicker, opts);
    self.viewModel.updateFromData();
    $osf.applyBindings(self.viewModel, selector);
}

module.exports = {
    AddonNodeConfig: AddonNodeConfig,
    _AddonNodeConfigViewModel: AddonFolderPickerViewModel
};
