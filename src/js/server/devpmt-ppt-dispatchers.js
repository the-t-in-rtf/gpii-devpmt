/* eslint-env node */
"use strict";
var fluid = require("infusion");
var gpii  = fluid.registerNamespace("gpii");

fluid.registerNamespace("gpii.devpmt.ppt");

gpii.devpmt.ppt.checkAuthorization = function (that, req, res /*, next */) {
    if (req.session.loggedInToPPT) {
        return true;
    }
    res.status("403").send("Not logged in to PPT.");
};

/**
 * Index Handler for /
 */
fluid.defaults("gpii.devpmt.dispatchers.index", {
    gradeNames: "gpii.devpmt.baseDispatcher",
    defaultTemplate: "index",
    rules: {
        contextToExpose: {
            npsetList: {
                "transform": {
                    type: "fluid.transforms.free",
                    func: "fluid.getForComponent",
                    args: ["{devpmt}", "model.npsetList"]
                }
            },
            selectedDemoSets: {
                "transform": {
                    type: "fluid.transforms.free",
                    func: "fluid.getForComponent",
                    args: ["{devpmt}", "model.selectedDemoSets"]
                }
            }
        }
    },
    invokers: {
        checkAuthorization: {
            funcName: "gpii.devpmt.ppt.checkAuthorization",
            args: ["{that}", "{arguments}.0", "{arguments}.1", "{arguments}.2"] // req, res, next
        }
    }
});


// URLPATH /editprefs/:npset
fluid.defaults("gpii.devpmt.ppt.loginHandler", {
    gradeNames: ["gpii.devpmt.baseDispatcher"],
    defaultTemplate: "ppt-login",
    method: "use",
    invokers: {
        checkAuthorization: {
            funcName: "gpii.devpmt.ppt.loginHandler.checkAuthorization",
            args: ["{that}", "{arguments}.0", "{arguments}.1", "{arguments}.2"] // req, res, next
        }
    }
});

gpii.devpmt.ppt.loginHandler.checkAuthorization = function (that, req, res /*, next */) {
    //TODO Move to gpii-couch-user
    if (req.body.username === "morphic" && req.body.password === "gpii") {
        req.session.loggedInToPPT = true;
        res.redirect("/ppt");
        return false;
    }
    return true;
};

fluid.defaults("gpii.devpmt.ppt.logoutHandler", {
    gradeNames: ["gpii.devpmt.baseDispatcher"],
    defaultTemplate: "ppt-login",
    method: "use",
    invokers: {
        checkAuthorization: {
            funcName: "gpii.devpmt.ppt.logoutHandler.checkAuthorization",
            args: ["{that}", "{arguments}.0", "{arguments}.1", "{arguments}.2"] // req, res, next
        }
    }
});

gpii.devpmt.ppt.logoutHandler.checkAuthorization = function (that, req, res /*, next */) {
    req.session.destroy(function (err) {
        if (err) {
            res.status(500).send(err);
        }
        res.redirect("/pptlogin");
    });
    return false;
};

/**
 * Dispatcher for the page allowing you to edit a preferences safe.
 */
fluid.defaults("gpii.devpmt.editPrefSetHandler", {
    gradeNames: ["gpii.devpmt.baseDispatcher"],
    handlerGrades: [],
    path: ["/editprefs/:npset"],
    defaultTemplate: "editprefset",
    rules: {
        contextToExpose: {
            commonTerms: {
                "transform": {
                    type: "fluid.transforms.free",
                    func: "fluid.getForComponent",
                    args: ["{gpii.devpmt}", "commonTermsDataSource.current.schemas"]
                }
            },
            allSolutions: {
                "transform": {
                    type: "fluid.transforms.free",
                    func: "fluid.getForComponent",
                    args: ["{devpmt}", "model.solutions"]
                }
            }
        }
    },
    invokers: {
        contextPromise: {
            funcName: "gpii.devpmt.editPrefSetHandler.contextPromise",
            args: ["{that}", "{gpii.devpmt}", "{arguments}.0"]
        },
        checkAuthorization: {
            funcName: "gpii.devpmt.ppt.checkAuthorization",
            args: ["{that}", "{arguments}.0", "{arguments}.1", "{arguments}.2"] // req, res, next
        }
    }
});

/**
 * Adds the `gpii.devpmt.npset` for the request to the handlebars context.
 */
gpii.devpmt.editPrefSetHandler.contextPromise = function (that, devpmt, req) {
    var promTogo = fluid.promise();
    fluid.promise.map(devpmt.prefSetDataSource.get({prefsSafeId: req.params.npset}), function (data) {
        if (!data) {
            promTogo.reject({
                isError: true,
                message: "Couldn't find preferences safe."
            });
            return;
        };
        var npset = devpmt.ontologyHandler.rawPrefsToOntology(data.preferences, "flat");
        var prefset = gpii.devpmt.npset({
            npsetName: req.params.npset,
            flatPrefs: npset,
            docs: ""
        });
        promTogo.resolve({
            npset: prefset
        });
    });
    return promTogo;
};

// URLPATH /saveprefset/:npset
fluid.registerNamespace("gpii.devpmt.savePrefsetHandler");

fluid.defaults("gpii.devpmt.savePrefsetHandler", {
    gradeNames: ["gpii.express.middleware"],
    path: ["/saveprefset/:npset"],
    invokers: {
        middleware: {
            funcName: "gpii.devpmt.savePrefsetHandler.handleRequest",
            args: ["{that}", "{devpmt}", "{arguments}.0", "{arguments}.1" /*, "{arguments}.2" */]
        }
        //TODO Auth check
    }
});

gpii.devpmt.savePrefsetHandler.handleRequest = function (that, devpmt, req, res /*, next */) {
    devpmt.prefSetDataSource.set({prefSetId: req.params.npset}, req.body);
    res.send("{result: 'ok'}");
};

// URLPATH /add-prefset
fluid.registerNamespace("gpii.devpmt.addPrefsetFormHandler");

fluid.defaults("gpii.devpmt.addPrefsetFormHandler", {
    gradeNames: ["gpii.express.middleware"],
    path: ["/add-prefset"],
    invokers: {
        middleware: {
            funcName: "gpii.devpmt.addPrefsetFormHandler.handleRequest",
            args: ["{that}", "{devpmt}", "{arguments}.0", "{arguments}.1" /*, "{arguments}.2" */]
        }
        //TODO Auth check
    }
});

gpii.devpmt.addPrefsetFormHandler.handleRequest = function (that, devpmt, req, res /*, next */) {
    var prefsetName = req.body["prefset-name"];
    gpii.devpmt.addNPSet(devpmt.prefSetDataSource, prefsetName);
    res.redirect("/editprefs/" + prefsetName);
};