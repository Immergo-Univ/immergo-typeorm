import { __awaiter, __extends, __generator } from "tslib";
import { AbstractSqliteDriver } from "../sqlite-abstract/AbstractSqliteDriver";
import { CapacitorQueryRunner } from "./CapacitorQueryRunner";
import { DriverOptionNotSetError, DriverPackageNotInstalledError, } from "../../error";
var CapacitorDriver = /** @class */ (function (_super) {
    __extends(CapacitorDriver, _super);
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    function CapacitorDriver(connection) {
        var _this = _super.call(this, connection) || this;
        _this.database = _this.options.database;
        _this.driver = _this.options.driver;
        // validate options to make sure everything is set
        if (!_this.options.database)
            throw new DriverOptionNotSetError("database");
        if (!_this.options.driver)
            throw new DriverOptionNotSetError("driver");
        // load sqlite package
        _this.sqlite = _this.options.driver;
        return _this;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Performs connection to the database.
     */
    CapacitorDriver.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.databaseConnection = this.createDatabaseConnection();
                        return [4 /*yield*/, this.databaseConnection];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Closes connection with database.
     */
    CapacitorDriver.prototype.disconnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var databaseConnection;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.queryRunner = undefined;
                        return [4 /*yield*/, this.databaseConnection];
                    case 1:
                        databaseConnection = _a.sent();
                        return [2 /*return*/, databaseConnection.close().then(function () {
                                _this.databaseConnection = undefined;
                            })];
                }
            });
        });
    };
    /**
     * Creates a query runner used to execute database queries.
     */
    CapacitorDriver.prototype.createQueryRunner = function (mode) {
        if (!this.queryRunner)
            this.queryRunner = new CapacitorQueryRunner(this);
        return this.queryRunner;
    };
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Creates connection with the database.
     */
    CapacitorDriver.prototype.createDatabaseConnection = function () {
        return __awaiter(this, void 0, void 0, function () {
            var databaseMode, isDatabaseEncryted, databaseVersion, connection;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        databaseMode = this.options.mode || "no-encryption";
                        isDatabaseEncryted = databaseMode !== "no-encryption";
                        databaseVersion = typeof this.options.version === "undefined"
                            ? 1
                            : this.options.version;
                        return [4 /*yield*/, this.sqlite.createConnection(this.options.database, isDatabaseEncryted, databaseMode, databaseVersion)];
                    case 1:
                        connection = _a.sent();
                        return [4 /*yield*/, connection.open()];
                    case 2:
                        _a.sent();
                        // we need to enable foreign keys in sqlite to make sure all foreign key related features
                        // working properly. this also makes onDelete to work with sqlite.
                        return [4 /*yield*/, connection.query("PRAGMA foreign_keys = ON")];
                    case 3:
                        // we need to enable foreign keys in sqlite to make sure all foreign key related features
                        // working properly. this also makes onDelete to work with sqlite.
                        _a.sent();
                        if (!(this.options.journalMode &&
                            ["DELETE", "TRUNCATE", "PERSIST", "MEMORY", "WAL", "OFF"].indexOf(this.options.journalMode) !== -1)) return [3 /*break*/, 5];
                        return [4 /*yield*/, connection.query("PRAGMA journal_mode = ".concat(this.options.journalMode))];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [2 /*return*/, connection];
                }
            });
        });
    };
    CapacitorDriver.prototype.loadDependencies = function () {
        this.sqlite = this.driver;
        if (!this.driver) {
            throw new DriverPackageNotInstalledError("Capacitor", "@capacitor-community/sqlite");
        }
    };
    return CapacitorDriver;
}(AbstractSqliteDriver));
export { CapacitorDriver };

//# sourceMappingURL=CapacitorDriver.js.map
