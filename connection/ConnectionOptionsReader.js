"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionOptionsReader = void 0;
var tslib_1 = require("tslib");
var app_root_path_1 = (0, tslib_1.__importDefault)(require("app-root-path"));
var path_1 = (0, tslib_1.__importDefault)(require("path"));
var PlatformTools_1 = require("../platform/PlatformTools");
var ConnectionOptionsEnvReader_1 = require("./options-reader/ConnectionOptionsEnvReader");
var ConnectionOptionsYmlReader_1 = require("./options-reader/ConnectionOptionsYmlReader");
var ConnectionOptionsXmlReader_1 = require("./options-reader/ConnectionOptionsXmlReader");
var error_1 = require("../error");
var PathUtils_1 = require("../util/PathUtils");
var ImportUtils_1 = require("../util/ImportUtils");
/**
 * Reads connection options from the ormconfig.
 * Can read from multiple file extensions including env, json, js, xml and yml.
 */
var ConnectionOptionsReader = /** @class */ (function () {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    function ConnectionOptionsReader(options) {
        this.options = options;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Returns all connection options read from the ormconfig.
     */
    ConnectionOptionsReader.prototype.all = function () {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var options;
            return (0, tslib_1.__generator)(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.load()];
                    case 1:
                        options = _a.sent();
                        if (!options)
                            throw new error_1.TypeORMError("No connection options were found in any orm configuration files.");
                        return [2 /*return*/, options];
                }
            });
        });
    };
    /**
     * Gets a connection with a given name read from ormconfig.
     * If connection with such name would not be found then it throw error.
     */
    ConnectionOptionsReader.prototype.get = function (name) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var allOptions, targetOptions;
            return (0, tslib_1.__generator)(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.all()];
                    case 1:
                        allOptions = _a.sent();
                        targetOptions = allOptions.find(function (options) { return options.name === name || (name === "default" && !options.name); });
                        if (!targetOptions)
                            throw new error_1.TypeORMError("Cannot find connection ".concat(name, " because its not defined in any orm configuration files."));
                        return [2 /*return*/, targetOptions];
                }
            });
        });
    };
    /**
     * Checks if there is a TypeORM configuration file.
     */
    ConnectionOptionsReader.prototype.has = function (name) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var allOptions, targetOptions;
            return (0, tslib_1.__generator)(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.load()];
                    case 1:
                        allOptions = _a.sent();
                        if (!allOptions)
                            return [2 /*return*/, false];
                        targetOptions = allOptions.find(function (options) { return options.name === name || (name === "default" && !options.name); });
                        return [2 /*return*/, !!targetOptions];
                }
            });
        });
    };
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Loads all connection options from a configuration file.
     *
     * todo: get in count NODE_ENV somehow
     */
    ConnectionOptionsReader.prototype.load = function () {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var connectionOptions, fileFormats, possibleExtension, fileExtension, foundFileFormat, configFile, _a, importOrRequireResult, moduleSystem, configModule;
            var _this = this;
            return (0, tslib_1.__generator)(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        connectionOptions = undefined;
                        fileFormats = ["env", "js", "mjs", "cjs", "ts", "mts", "cts", "json", "yml", "yaml", "xml"];
                        possibleExtension = this.baseFilePath.substr(this.baseFilePath.lastIndexOf("."));
                        fileExtension = fileFormats.find(function (extension) { return ".".concat(extension) === possibleExtension; });
                        foundFileFormat = fileExtension || fileFormats.find(function (format) {
                            return PlatformTools_1.PlatformTools.fileExist(_this.baseFilePath + "." + format);
                        });
                        configFile = fileExtension ? this.baseFilePath : this.baseFilePath + "." + foundFileFormat;
                        // if .env file found then load all its variables into process.env using dotenv package
                        if (foundFileFormat === "env") {
                            PlatformTools_1.PlatformTools.dotenv(configFile);
                        }
                        else if (PlatformTools_1.PlatformTools.fileExist(this.baseDirectory + "/.env")) {
                            PlatformTools_1.PlatformTools.dotenv(this.baseDirectory + "/.env");
                        }
                        if (!(PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_CONNECTION") || PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_URL"))) return [3 /*break*/, 2];
                        return [4 /*yield*/, new ConnectionOptionsEnvReader_1.ConnectionOptionsEnvReader().read()];
                    case 1:
                        connectionOptions = _b.sent();
                        return [3 /*break*/, 12];
                    case 2:
                        if (!(foundFileFormat === "js" || foundFileFormat === "mjs" || foundFileFormat === "cjs" ||
                            foundFileFormat === "ts" || foundFileFormat === "mts" || foundFileFormat === "cts")) return [3 /*break*/, 5];
                        return [4 /*yield*/, (0, ImportUtils_1.importOrRequireFile)(configFile)];
                    case 3:
                        _a = tslib_1.__read.apply(void 0, [_b.sent(), 2]), importOrRequireResult = _a[0], moduleSystem = _a[1];
                        return [4 /*yield*/, importOrRequireResult];
                    case 4:
                        configModule = _b.sent();
                        if (moduleSystem === "esm" || (configModule && "__esModule" in configModule && "default" in configModule)) {
                            connectionOptions = configModule.default;
                        }
                        else {
                            connectionOptions = configModule;
                        }
                        return [3 /*break*/, 12];
                    case 5:
                        if (!(foundFileFormat === "json")) return [3 /*break*/, 6];
                        connectionOptions = require(configFile);
                        return [3 /*break*/, 12];
                    case 6:
                        if (!(foundFileFormat === "yml")) return [3 /*break*/, 8];
                        return [4 /*yield*/, new ConnectionOptionsYmlReader_1.ConnectionOptionsYmlReader().read(configFile)];
                    case 7:
                        connectionOptions = _b.sent();
                        return [3 /*break*/, 12];
                    case 8:
                        if (!(foundFileFormat === "yaml")) return [3 /*break*/, 10];
                        return [4 /*yield*/, new ConnectionOptionsYmlReader_1.ConnectionOptionsYmlReader().read(configFile)];
                    case 9:
                        connectionOptions = _b.sent();
                        return [3 /*break*/, 12];
                    case 10:
                        if (!(foundFileFormat === "xml")) return [3 /*break*/, 12];
                        return [4 /*yield*/, new ConnectionOptionsXmlReader_1.ConnectionOptionsXmlReader().read(configFile)];
                    case 11:
                        connectionOptions = _b.sent();
                        _b.label = 12;
                    case 12:
                        // normalize and return connection options
                        if (connectionOptions) {
                            return [2 /*return*/, this.normalizeConnectionOptions(connectionOptions)];
                        }
                        return [2 /*return*/, undefined];
                }
            });
        });
    };
    /**
     * Normalize connection options.
     */
    ConnectionOptionsReader.prototype.normalizeConnectionOptions = function (connectionOptions) {
        var _this = this;
        if (!(Array.isArray(connectionOptions)))
            connectionOptions = [connectionOptions];
        connectionOptions.forEach(function (options) {
            options.baseDirectory = _this.baseDirectory;
            if (options.entities) {
                var entities = options.entities.map(function (entity) {
                    if (typeof entity === "string" && entity.substr(0, 1) !== "/")
                        return _this.baseDirectory + "/" + entity;
                    return entity;
                });
                Object.assign(connectionOptions, { entities: entities });
            }
            if (options.subscribers) {
                var subscribers = options.subscribers.map(function (subscriber) {
                    if (typeof subscriber === "string" && subscriber.substr(0, 1) !== "/")
                        return _this.baseDirectory + "/" + subscriber;
                    return subscriber;
                });
                Object.assign(connectionOptions, { subscribers: subscribers });
            }
            if (options.migrations) {
                var migrations = options.migrations.map(function (migration) {
                    if (typeof migration === "string" && migration.substr(0, 1) !== "/")
                        return _this.baseDirectory + "/" + migration;
                    return migration;
                });
                Object.assign(connectionOptions, { migrations: migrations });
            }
            // make database path file in sqlite relative to package.json
            if (options.type === "sqlite" || options.type === "better-sqlite3") {
                if (typeof options.database === "string" && !(0, PathUtils_1.isAbsolute)(options.database) &&
                    options.database.substr(0, 1) !== "/" && // unix absolute
                    options.database.substr(1, 2) !== ":\\" && // windows absolute
                    options.database !== ":memory:") {
                    Object.assign(options, {
                        database: _this.baseDirectory + "/" + options.database
                    });
                }
            }
        });
        return connectionOptions;
    };
    Object.defineProperty(ConnectionOptionsReader.prototype, "baseFilePath", {
        /**
         * Gets directory where configuration file should be located and configuration file name.
         */
        get: function () {
            return path_1.default.resolve(this.baseDirectory, this.baseConfigName);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ConnectionOptionsReader.prototype, "baseDirectory", {
        /**
         * Gets directory where configuration file should be located.
         */
        get: function () {
            if (this.options && this.options.root)
                return this.options.root;
            return app_root_path_1.default.path;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ConnectionOptionsReader.prototype, "baseConfigName", {
        /**
         * Gets configuration file name.
         */
        get: function () {
            if (this.options && this.options.configName)
                return this.options.configName;
            return "ormconfig";
        },
        enumerable: false,
        configurable: true
    });
    return ConnectionOptionsReader;
}());
exports.ConnectionOptionsReader = ConnectionOptionsReader;

//# sourceMappingURL=ConnectionOptionsReader.js.map
