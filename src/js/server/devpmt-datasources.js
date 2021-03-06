"use strict";

var gpii = fluid.registerNamespace("gpii");
fluid.registerNamespace("gpii.devpmt");
var fs = require("fs");
var kettle = require("kettle");


/**
 * PreFetch DataSource
 * `gpii.devpmt.dataSource.prefetchDataSource`
 *
 * A `kettle.dataSource` like component that is backed by a
 * specific dataSource subcomponent. When the prefetchDataSource is
 * created, it immediately fetches a copy of data using the dataSource's
 * get method and stores it in the `current` member.  Each time the
 * get method is used, the value of `current` is updated.
 */
fluid.defaults("gpii.devpmt.dataSource.prefetchDataSource", {
    gradeNames: ["fluid.component"],
    components: {
        dataSource: null
    },
    invokers: {
        get: {
            funcName: "gpii.devpmt.dataSource.prefetchDataSource.get",
            args: ["{that}", "{arguments}.0", "{arguments}.1", "{arguments}.2"]
        }
    },
    members: {
        current: null
    },
    listeners: {
        onCreate: {
            func: "{that}.get"
        }
    }
});

/**
 * `get` implementation for `gpii.devpmt.dataSource.prefetchDataSource`.
 * Fetches data from the underlying dataSource
 * @param  {Object} that        prefetchDataSource instance
 * @param  {Object} directModel `kettle.dataSource` directModel
 * @param  {Object} options     `kettle.dataSource` options
 * @return {Promise}            `kettle.dataSource.get` promise
 */
gpii.devpmt.dataSource.prefetchDataSource.get = function (that, directModel, options) {
    var promiseFetch = that.dataSource.get(directModel, options);
    promiseFetch.then(function (data) {
        that.current = data;
    });
    return promiseFetch;
};

/**
 * `gpii.devpmt.dataSource.prefSetDocs`
 *
 * File based dataSource that fetches a prefSet markdown documentation file
 * typically from testData/preferences.  That directory should be passed in as
 * `prefSetDir` in the construction options. And `prefSetId` is
 * used in the termMap.
 */
fluid.defaults("gpii.devpmt.dataSource.prefSetDocs", {
    gradeNames: "kettle.dataSource.file",
    prefSetDir: "", // Should be passed in options
    path: "%prefSetDir/%prefSetId.md",
    termMap: {
        prefSetId: "%prefSetId",
        prefSetDir: "{that}.options.prefSetDir"
    },
    writable: false,
    components: {
        encoding: {
            type: "kettle.dataSource.encoding.none"
        }
    }
});

/**
 * Prefetched DataSource for our new metadata that includes descriptive content for each
 * common term including a json schema.
 */
fluid.defaults("gpii.devpmt.dataSource.commonTermsMetadata", {
    gradeNames: ["gpii.devpmt.dataSource.prefetchDataSource"],
    components: {
        dataSource: {
            type: "kettle.dataSource.file",
            options: {
                path: "@expand:fluid.module.resolvePath(%gpii-devpmt/node_modules/gpii-universal/testData/ontologies/flat.json5)",
                components: {
                    encoding: {
                        type: "kettle.dataSource.encoding.JSON5"
                    }
                }
            }
        }
    }
});

/**
 * `gpii.devpmt.dataSource.prefSetDocs`
 *
 * File based dataSource that fetches a prefSet markdown documentation file
 * typically from testData/preferences.  That directory should be passed in as
 * `prefSetDir` in the construction options. And `prefSetId` is
 * used in the termMap.
 */
fluid.defaults("gpii.devpmt.dataSource.solutions", {
    gradeNames: "kettle.dataSource.file",
    solutionsDir: "", // Should be passed in options
    path: "%solutionsDir/%osId.json5",
    termMap: {
        osId: "%osId",
        solutionsDir: "{that}.options.solutionsDir"
    },
    writable: false,
    components: {
        encoding: {
            type: "kettle.dataSource.encoding.JSON5"
        }
    }
});

/**
 * If the NP Set does not exist yet, creates a blank one,
 * otherwise does nothing.
 *
 * @param {dataSource} prefSetDataSource
 * @param {string} npsetName
 */
gpii.devpmt.addNPSet = function (prefSetDataSource, npsetName) {
    // TODO find a way to check natively in the datasource if this
    // file exists already
    var filename = prefSetDataSource.options.prefSetDir + npsetName + ".json";
    if (fs.existsSync(filename)) {
        return;
    }

    var data = {
        "flat": {
            "name": npsetName,
            "contexts": {
                "gpii-default": {
                    "name": "Default preferences",
                    "preferences": {}
                }
            }
        }
    };
    prefSetDataSource.set({prefSetId: npsetName}, data);
};

/**
 * `gpii.devpmt.dataSource.dirListing`
 *
 * This is a read only data source that returns an array of the
 * contents of a directory. Expects a `path` for the directory
 * in the component options when created.
 *
 * The array returned from the datasource `get` is a list of filenames
 * relative to the directory they are in, ie. they do not contain their
 * parent directories.
 */
fluid.defaults("gpii.devpmt.dataSource.dirListing", {
    gradeNames: ["kettle.dataSource"],
    readOnlyGrade: "gpii.devpmt.dataSource.fileListing",
    invokers: {
        get: {
            funcName: "gpii.devpmt.dataSource.dirListing.handle",
            args: ["{that}", "{arguments}.0", "{arguments}.1"] // options, directModel
        }
    },
    components: {
        encoding: {
            type: "kettle.dataSource.encoding.JSON"
        }
    }
});

/**
 * Standard `handle` method for the `dirListing` datasource
 * with standard `kettle.dataSource` signature.
 *
 * @param  {Object} that        prefetchDataSource instance
 * @param  {Object} directModel `kettle.dataSource` directModel
 * @param  {Object} options     `kettle.dataSource` options
 */
gpii.devpmt.dataSource.dirListing.handle = function (that, requestOptions, directModel) {
    if (!that.options.path) {
        fluid.fail("Cannot operate file dataSource ", that, " without an option named \"path\"");
    }
    var fileName = kettle.dataSource.URL.resolveUrl(that.options.path, that.options.termMap, directModel, true).replace("//", "/");
    var promise = fluid.promise();
    fs.readdir(fileName, function (err, files) {
        promise.resolve(files);
    });
    return promise;
};

/**
 * `gpii.devpmt.dataSource.prefsetListing`
 *
 * Data source to list the files in the testData preferences directory.
 * Takes the absolute path to the directory as the `prefSetDir` component
 * option.
 */
fluid.defaults("gpii.devpmt.dataSource.prefsetDirListing", {
    gradeNames: ["gpii.devpmt.dataSource.dirListing"],
    path: "%prefSetDir/",
    termMap: {
        prefSetDir: "{that}.options.prefSetDir"
    }
});

/**
 * `gpii.devpmt.dataSource.prefsSafeListing.filesystem`
 *
 * Data Source to return an array of preference set ids/names in the
 * system. Currently returns them all, but in the future could allow
 * for paging/filtering.
 */
fluid.defaults("gpii.devpmt.dataSource.prefsSafeListing.filesystem", {
    gradeNames: ["kettle.dataSource"],
    readOnlyGrade: "gpii.devpmt.dataSource.prefsSafeListing.filesystem",
    components: {
        dirListingDataSource: {
            type: "gpii.devpmt.dataSource.prefsetDirListing",
            options: {
                prefSetDir: "{gpii.devpmt}.options.prefsetDirectory"
            }
        }
    },
    writable: false,
    invokers: {
        get: {
            funcName: "gpii.devpmt.dataSource.prefsSafeListing.filesystem.get",
            args: ["{that}", "{arguments}.0", "{arguments}.1", "{arguments}.2"]
        }
    }
});

gpii.devpmt.dataSource.prefsSafeListing.filesystem.get = function (that, directModel, options) {
    var togo = fluid.promise();
    var prom = that.dirListingDataSource.get(directModel, options);
    prom.then(function (data) {
        var prefsSafes = [];
        fluid.each(data, function (val) {
            if (val.endsWith(".json") || val.endsWith(".json5")) {
                prefsSafes.push(val.split(/\./)[0]);
            }
        });
        togo.resolve(prefsSafes);
    });
    return togo;
};

fluid.defaults("gpii.devpmt.dataSource.prefsSafeListing.couchdb", {
    gradeNames: ["kettle.dataSource"],
    writable: false,
    readOnlyGrade: "gpii.devpmt.dataSource.prefsSafeListing.couchdb",
    components: {
        prefsSafeByName: {
            type: "kettle.dataSource.URL",
            options: {
                url: "http://localhost:5984/gpii/_design/views/_view/findPrefsSafeByName",
                writable: false
            }
        }
    },
    invokers: {
        get: {
            funcName: "gpii.devpmt.dataSource.prefsSafeListing.couchdb.get",
            args: ["{that}", "{arguments}.0", "{arguments}.1", "{arguments}.2"]
        }
    }
});

gpii.devpmt.dataSource.prefsSafeListing.couchdb.get = function (that /*, directModel, options */) {
    var togo = fluid.promise();
    var prom = that.prefsSafeByName.get();
    prom.then(function (data) {
        var prefsSafes = [];
        fluid.each(data.rows, function (i) {
            prefsSafes.push(i.key);
        });
        togo.resolve(prefsSafes);
    });
    return togo;
};
