/**
 * Dialog boxes for the DevPTT.
 */
"use strict";

var gpii  = fluid.registerNamespace("gpii");
fluid.registerNamespace("gpii.devpmt");
fluid.registerNamespace("gpii.devpmt.dialogs");

/**
 * Add NP Set Context Dialog
 */
fluid.defaults("gpii.devpmt.dialogs.addContextDialog", {
    gradeNames: ["gpii.devpmt.dialogs.confirmDialog"],
    templates: {
        initial: "editprefset-addContext-dialog"
    },
    model: {
        contextId: "",
        contextToCopy: "",
        contextNames: [],
        fieldErrors: ""
    },
    selectors: {
        contextIdInput: "#pmt-add-context-name-input",
        contextToCopySelect: "#pmt-context-to-copy-select"
    },
    bindings: {
        contextIdInput: "contextId",
        contextToCopySelect: "contextToCopy"
    },
    invokers: {
        acceptConfirmDialog: {
            funcName: "gpii.devpmt.dialogs.addContextDialog.acceptConfirmDialog",
            args: ["{that}", "{gpii.devpmt.editPrefs}", "{arguments}.0"]
        }
    }
});

/**
 * Dialog for adding a new preference set (context) to a preferences safe (prefset).
 * Includes a dropdown that can be used to select a context to copy the
 * initial settings from.
 *
 * @param  {that} that           Add Context Dialog instance
 * @param  {editPrefs} editPrefs Central gpii.devpmt.editPrefs component for the page.
 */
gpii.devpmt.dialogs.addContextDialog.acceptConfirmDialog = function (that, editPrefs, event) {
    // We don't want the form to actually submit the page, just to enable
    // activating the submit button on Enter
    event.preventDefault();

    // Validate context name, eventually this will be replaced with
    // our new json schema work.
    if (that.model.contextId === "") {
        that.applier.change("fieldErrors", "Please enter a name.");
        that.reRender();
        return;
    }
    else if (!/^\w+$/.exec(that.model.contextId)) {
        that.applier.change("fieldErrors", "Please use only alphanumeric characters.");
        that.reRender();
        return;
    }
    else {
        // In case we are revalidating on a subsequent attempt
        that.applier.change("fieldErrors", "");
    }

    // TODO validation to see if already exists, and determining
    // the valid set of strings a context ID can take
    var contextToCopy = that.model.contextToCopy;
    var path = "flatPrefs.contexts." + that.model.contextId;
    var newPrefSet = {};
    // The select contains a blank option to start with a fresh set of values.
    if (that.model.contextToCopy !== "" && editPrefs.model.flatPrefs.contexts[contextToCopy]) {
        newPrefSet = fluid.copy(editPrefs.model.flatPrefs.contexts[contextToCopy].preferences);
    }
    editPrefs.applier.change(path, {
        "name": that.model.contextId,
        "preferences": newPrefSet
    }, "ADD");
    that.closeDialog();
};

/**
 * Edit NP Set Context Dialog
 */
fluid.defaults("gpii.devpmt.dialogs.editContextDialog", {
    gradeNames: ["gpii.devpmt.dialogs.confirmDialog"],
    templates: {
        initial: "editprefset-editContext-dialog"
    },
    model: {
        // Store so that we can fetch the context to copy to a new ID
        originalContextId: "",
        contextId: "",
        contextIdErrors: "",
        contextName: "",
        contextNameErrors: "",
        fieldErrors: ""
    },
    selectors: {
        contextIdInput: "#pmt-edit-context-id-input",
        contextNameInput: "#pmt-edit-context-name-input"
    },
    bindings: {
        contextIdInput: "contextId",
        contextNameInput: "contextName"
    },
    invokers: {
        acceptConfirmDialog: {
            funcName: "gpii.devpmt.dialogs.editContextDialog.acceptConfirmDialog",
            args: ["{that}", "{gpii.devpmt.editPrefs}", "{arguments}.0"]
        }
    }
});

gpii.devpmt.dialogs.editContextDialog.acceptConfirmDialog = function (that, editPrefs, event) {
    // We don't want the form to actually submit the page, just to enable
    // activating the submit button on Enter
    event.preventDefault();

    // Validate context name, eventually this will be replaced with
    // our new json schema work.
    if (that.model.contextId === "") {
        that.applier.change("contextIdErrors", "Please enter an ID.");
        that.reRender();
        return;
    }
    // TODO standardize the accepted regular expression for prefset ID's
    // and other parts of the schema.
    else if (!/^[\w-]+$/.exec(that.model.contextId)) {
        that.applier.change("contextIdErrors", "Please use only alphanumeric characters.");
        that.reRender();
        return;
    }
    // If we changed the contextId, make sure that there isn't an existing context with
    // that ID
    else if (that.model.contextId !== that.model.originalContextId &&
             editPrefs.prefsetExists(that.model.contextId)) {
        that.applier.change("contextIdErrors", "A Preference Set with that ID already exists.");
        that.reRender();
        return;
    }
    else {
        // In case we are revalidating on a subsequent attempt
        that.applier.change("contextIdErrors", "");
    }

    if (that.model.contextName === "") {
        that.applier.change("contextNameErrors", "Please enter a name.");
        that.reRender();
        return;
    }
    else {
        // In case we are revalidating on a subsequent attempt
        that.applier.change("contextNameErrors", "");
    }

    var transaction = editPrefs.applier.initiate();
    var prefsetToEdit = fluid.copy(editPrefs.model.flatPrefs.contexts[that.model.originalContextId]);
    prefsetToEdit.name = that.model.contextName;
    var oldPath = "flatPrefs.contexts." + that.model.originalContextId;
    var path = "flatPrefs.contexts." + that.model.contextId;

    transaction.fireChangeRequest({
        path: oldPath,
        type: "DELETE"
    });

    transaction.fireChangeRequest({
        path: path,
        value: prefsetToEdit
    });

    transaction.commit();
    that.closeDialog();
};


/**
 * Confirm deletion of NP Set Context Dialog
 */
fluid.defaults("gpii.devpmt.dialogs.confirmDeleteContextDialog", {
    gradeNames: ["gpii.devpmt.dialogs.confirmDialog"],
    templates: {
        initial: "editprefset-confirmDeleteContext-dialog"
    },
    model: {
        contextId: "" // Should be populated/relayed during construction before showing dialog
    },
    invokers: {
        acceptConfirmDialog: {
            funcName: "gpii.devpmt.dialogs.confirmDeleteContextDialog.acceptConfirmDialog",
            args: ["{that}", "{gpii.devpmt.editPrefs}", "{that}.model.contextId"]
        }
    }
});

gpii.devpmt.dialogs.confirmDeleteContextDialog.acceptConfirmDialog = function (that, editPrefs, contextId) {
    that.closeDialog();
    var path = "flatPrefs.contexts." + contextId;
    editPrefs.applier.change(path, false, "DELETE");
};

/**
 * Add Product to NP Set Dialog
 */
fluid.defaults("gpii.devpmt.dialogs.confirmAddProductDialog", {
    gradeNames: ["gpii.devpmt.dialogs.confirmDialog"],
    templates: {
        initial: "editprefset-confirmAddProduct-dialog"
    },
    model: {
        appId: null,
        name: null // Human Name of Product
    },
    invokers: {
        acceptConfirmDialog: {
            funcName: "gpii.devpmt.dialogs.confirmAddProductDialog.acceptConfirmDialog",
            args: ["{that}", "{that}.model.appId", "{gpii.devpmt.editPrefs}.model.contextNames", "{gpii.devpmt.editPrefs}.editProductEnabled"]
        }
    }
});

/**
 * Clicking Add on the Product Dialog adds this product to the preference set.
 * A preference safe must have at least one context (prefset) in order to add
 * a product to it.
 *
 * @param  {Object} that               Dialog instance
 * @param  {String} appId              String indicating the appId
 *                                     ex. http://registry.gpii.net/applications/com.android.freespeech
 * @param  {Array} contextNames        Array of Strings with the name/id the context is
 *                                     keyed by. The product will be initially added to the first
 *                                     item in this array.
 * @param  {Function} editProductEnabled Invoker from `gpii.devpmt.editPrefs` to add the
 *                                       product to.
 */
gpii.devpmt.dialogs.confirmAddProductDialog.acceptConfirmDialog = function (that, appId, contextNames, editProductEnabled) {
    // In this case we actually need to close the dialog first... as the page
    // rerenders based on a model listener when the product is enabled, and does
    // wonky things... such as removing the ability to vertical scroll. Should look
    // at reworking this perhaps.
    that.closeDialog();
    // TODO Ontology!!!
    var appUrl = "http://registry.gpii.net/applications/" + appId;
    if (contextNames.length > 0) {
        editProductEnabled(true, contextNames[0],  appUrl);
    }
};

/**
 * Confirm NP Set Save Dialog
 */
fluid.defaults("gpii.devpmt.dialogs.confirmSaveDialog", {
    gradeNames: ["gpii.devpmt.dialogs.confirmDialog"],
    templates: {
        initial: "editprefset-confirmSave-dialog"
    },
    model: {
        unsavedChanges: []
    },
    invokers: {
        acceptConfirmDialog: {
            funcName: "gpii.devpmt.dialogs.confirmSaveDialog.acceptConfirmDialog",
            args: ["{that}", "{gpii.devpmt.editPrefs}.savePrefset"]
        }
    }
});

gpii.devpmt.dialogs.confirmSaveDialog.acceptConfirmDialog = function (that, saveFunc) {
    saveFunc();
    that.closeDialog();
};


/**
 * Confirm Removing Product Dialog
 */
fluid.defaults("gpii.devpmt.dialogs.confirmRemoveProductDialog", {
    gradeNames: ["gpii.devpmt.dialogs.confirmDialog"],
    templates: {
        initial: "editprefset-confirmRemoveProduct-dialog"
    },
    model: {
        appId: "",
        name: "",
        product: "",
        context: ""
    },
    invokers: {
        acceptConfirmDialog: {
            funcName: "gpii.devpmt.dialogs.confirmRemoveProductDialog.acceptConfirmDialog",
            args: ["{that}", "{gpii.devpmt.editPrefs}"]
        }
    }
});

gpii.devpmt.dialogs.confirmRemoveProductDialog.acceptConfirmDialog = function (that, devpmt) {
    that.closeDialog();
    devpmt.editProductEnabled(false, that.model.context, that.model.product);
};
