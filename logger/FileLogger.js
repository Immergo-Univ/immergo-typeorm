"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileLogger = void 0;
var tslib_1 = require("tslib");
var app_root_path_1 = (0, tslib_1.__importDefault)(require("app-root-path"));
var PlatformTools_1 = require("../platform/PlatformTools");
/**
 * Performs logging of the events in TypeORM.
 * This version of logger logs everything into ormlogs.log file.
 */
var FileLogger = /** @class */ (function () {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    function FileLogger(options, fileLoggerOptions) {
        this.options = options;
        this.fileLoggerOptions = fileLoggerOptions;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Logs query and parameters used in it.
     */
    FileLogger.prototype.logQuery = function (query, parameters, queryRunner) {
        if (this.options === "all" || this.options === true || (Array.isArray(this.options) && this.options.indexOf("query") !== -1)) {
            var sql = query + (parameters && parameters.length ? " -- PARAMETERS: " + this.stringifyParams(parameters) : "");
            this.write("[QUERY]: " + sql);
        }
    };
    /**
     * Logs query that is failed.
     */
    FileLogger.prototype.logQueryError = function (error, query, parameters, queryRunner) {
        if (this.options === "all" || this.options === true || (Array.isArray(this.options) && this.options.indexOf("error") !== -1)) {
            var sql = query + (parameters && parameters.length ? " -- PARAMETERS: " + this.stringifyParams(parameters) : "");
            this.write([
                "[FAILED QUERY]: ".concat(sql),
                "[QUERY ERROR]: ".concat(error)
            ]);
        }
    };
    /**
     * Logs query that is slow.
     */
    FileLogger.prototype.logQuerySlow = function (time, query, parameters, queryRunner) {
        var sql = query + (parameters && parameters.length ? " -- PARAMETERS: " + this.stringifyParams(parameters) : "");
        this.write("[SLOW QUERY: ".concat(time, " ms]: ") + sql);
    };
    /**
     * Logs events from the schema build process.
     */
    FileLogger.prototype.logSchemaBuild = function (message, queryRunner) {
        if (this.options === "all" || (Array.isArray(this.options) && this.options.indexOf("schema") !== -1)) {
            this.write(message);
        }
    };
    /**
     * Logs events from the migrations run process.
     */
    FileLogger.prototype.logMigration = function (message, queryRunner) {
        this.write(message);
    };
    /**
     * Perform logging using given logger, or by default to the console.
     * Log has its own level and message.
     */
    FileLogger.prototype.log = function (level, message, queryRunner) {
        switch (level) {
            case "log":
                if (this.options === "all" || (Array.isArray(this.options) && this.options.indexOf("log") !== -1))
                    this.write("[LOG]: " + message);
                break;
            case "info":
                if (this.options === "all" || (Array.isArray(this.options) && this.options.indexOf("info") !== -1))
                    this.write("[INFO]: " + message);
                break;
            case "warn":
                if (this.options === "all" || (Array.isArray(this.options) && this.options.indexOf("warn") !== -1))
                    this.write("[WARN]: " + message);
                break;
        }
    };
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Writes given strings into the log file.
     */
    FileLogger.prototype.write = function (strings) {
        strings = Array.isArray(strings) ? strings : [strings];
        var basePath = app_root_path_1.default.path + "/";
        var logPath = "ormlogs.log";
        if (this.fileLoggerOptions && this.fileLoggerOptions.logPath) {
            logPath = PlatformTools_1.PlatformTools.pathNormalize(this.fileLoggerOptions.logPath);
        }
        strings = strings.map(function (str) { return "[" + new Date().toISOString() + "]" + str; });
        PlatformTools_1.PlatformTools.appendFileSync(basePath + logPath, strings.join("\r\n") + "\r\n"); // todo: use async or implement promises?
    };
    /**
     * Converts parameters to a string.
     * Sometimes parameters can have circular objects and therefor we are handle this case too.
     */
    FileLogger.prototype.stringifyParams = function (parameters) {
        try {
            return JSON.stringify(parameters);
        }
        catch (error) { // most probably circular objects in parameters
            return parameters;
        }
    };
    return FileLogger;
}());
exports.FileLogger = FileLogger;

//# sourceMappingURL=FileLogger.js.map
