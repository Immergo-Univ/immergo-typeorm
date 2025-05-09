import { __awaiter, __extends, __generator } from "tslib";
import { PostgresDriver } from "../postgres/PostgresDriver";
import { PlatformTools } from "../../platform/PlatformTools";
import { AuroraDataApiPostgresQueryRunner } from "../aurora-data-api-pg/AuroraDataApiPostgresQueryRunner";
import { ApplyValueTransformers } from "../../util/ApplyValueTransformers";
import { DriverUtils } from "../DriverUtils";
var PostgresWrapper = /** @class */ (function (_super) {
    __extends(PostgresWrapper, _super);
    function PostgresWrapper() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return PostgresWrapper;
}(PostgresDriver));
var AuroraDataApiPostgresDriver = /** @class */ (function (_super) {
    __extends(AuroraDataApiPostgresDriver, _super);
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    function AuroraDataApiPostgresDriver(connection) {
        var _this = _super.call(this) || this;
        /**
         * Represent transaction support by this driver
         */
        _this.transactionSupport = "nested";
        _this.connection = connection;
        _this.options = connection.options;
        _this.isReplicated = false;
        // load data-api package
        _this.loadDependencies();
        _this.client = new _this.DataApiDriver(_this.options.region, _this.options.secretArn, _this.options.resourceArn, _this.options.database, function (query, parameters) { return _this.connection.logger.logQuery(query, parameters); }, _this.options.serviceConfigOptions, _this.options.formatOptions);
        _this.database = DriverUtils.buildDriverOptions(_this.options).database;
        return _this;
    }
    // -------------------------------------------------------------------------
    // Public Implemented Methods
    // -------------------------------------------------------------------------
    /**
     * Performs connection to the database.
     * Based on pooling options, it can either create connection immediately,
     * either create a pool and create connection when needed.
     */
    AuroraDataApiPostgresDriver.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/];
            });
        });
    };
    /**
     * Closes connection with database.
     */
    AuroraDataApiPostgresDriver.prototype.disconnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/];
            });
        });
    };
    /**
     * Creates a query runner used to execute database queries.
     */
    AuroraDataApiPostgresDriver.prototype.createQueryRunner = function (mode) {
        var _this = this;
        return new AuroraDataApiPostgresQueryRunner(this, new this.DataApiDriver(this.options.region, this.options.secretArn, this.options.resourceArn, this.options.database, function (query, parameters) { return _this.connection.logger.logQuery(query, parameters); }, this.options.serviceConfigOptions, this.options.formatOptions), mode);
    };
    /**
     * Prepares given value to a value to be persisted, based on its column type and metadata.
     */
    AuroraDataApiPostgresDriver.prototype.preparePersistentValue = function (value, columnMetadata) {
        if (this.options.formatOptions && this.options.formatOptions.castParameters === false) {
            return _super.prototype.preparePersistentValue.call(this, value, columnMetadata);
        }
        if (columnMetadata.transformer)
            value = ApplyValueTransformers.transformTo(columnMetadata.transformer, value);
        return this.client.preparePersistentValue(value, columnMetadata);
    };
    /**
     * Prepares given value to a value to be persisted, based on its column type and metadata.
     */
    AuroraDataApiPostgresDriver.prototype.prepareHydratedValue = function (value, columnMetadata) {
        if (this.options.formatOptions && this.options.formatOptions.castParameters === false) {
            return _super.prototype.prepareHydratedValue.call(this, value, columnMetadata);
        }
        if (columnMetadata.transformer)
            value = ApplyValueTransformers.transformFrom(columnMetadata.transformer, value);
        return this.client.prepareHydratedValue(value, columnMetadata);
    };
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * If driver dependency is not given explicitly, then try to load it via "require".
     */
    AuroraDataApiPostgresDriver.prototype.loadDependencies = function () {
        var driver = this.options.driver || PlatformTools.load("typeorm-aurora-data-api-driver");
        var pg = driver.pg;
        this.DataApiDriver = pg;
    };
    /**
     * Executes given query.
     */
    AuroraDataApiPostgresDriver.prototype.executeQuery = function (connection, query) {
        return this.connection.query(query);
    };
    /**
     * Makes any action after connection (e.g. create extensions in Postgres driver).
     */
    AuroraDataApiPostgresDriver.prototype.afterConnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var extensionsMetadata;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.checkMetadataForExtensions()];
                    case 1:
                        extensionsMetadata = _a.sent();
                        if (!extensionsMetadata.hasExtensions) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.enableExtensions(extensionsMetadata, this.connection)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/, Promise.resolve()];
                }
            });
        });
    };
    return AuroraDataApiPostgresDriver;
}(PostgresWrapper));
export { AuroraDataApiPostgresDriver };

//# sourceMappingURL=AuroraDataApiPostgresDriver.js.map
