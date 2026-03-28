"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateScenariosManual = exports.getScenarios = exports.rebuildScenarioBundles = exports.getGenerationJob = exports.submitGenerationJob = exports.resolveAction = exports.updateJobProgress = exports.processGenerationBundle = exports.dailyNewsToScenarios = exports.recoverZombieJobs = exports.onScenarioJobCreated = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
const background_jobs_1 = require("./background-jobs");
const bundleIds_1 = require("./data/schemas/bundleIds");
const config_validator_1 = require("./lib/config-validator");
var background_jobs_2 = require("./background-jobs");
Object.defineProperty(exports, "onScenarioJobCreated", { enumerable: true, get: function () { return background_jobs_2.onScenarioJobCreated; } });
Object.defineProperty(exports, "recoverZombieJobs", { enumerable: true, get: function () { return background_jobs_2.recoverZombieJobs; } });
var news_to_scenarios_1 = require("./news-to-scenarios");
Object.defineProperty(exports, "dailyNewsToScenarios", { enumerable: true, get: function () { return news_to_scenarios_1.dailyNewsToScenarios; } });
var generation_services_1 = require("./generation-services");
Object.defineProperty(exports, "processGenerationBundle", { enumerable: true, get: function () { return generation_services_1.processGenerationBundle; } });
Object.defineProperty(exports, "updateJobProgress", { enumerable: true, get: function () { return generation_services_1.updateJobProgress; } });
var action_resolution_1 = require("./action-resolution");
Object.defineProperty(exports, "resolveAction", { enumerable: true, get: function () { return action_resolution_1.resolveAction; } });
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
function isAdminUser(request) {
    var _a;
    if (!request.auth) {
        return false;
    }
    const userEmail = ((_a = request.auth.token) === null || _a === void 0 ? void 0 : _a.email) || "";
    const userId = request.auth.uid;
    const adminUid = process.env.ADMIN_UID;
    const adminEmail = process.env.ADMIN_EMAIL;
    return !((adminUid || adminEmail) && userId !== adminUid && userEmail !== adminEmail);
}
function getIntakeSecret() {
    return process.env.GENERATION_INTAKE_SECRET || process.env.ADMIN_SECRET;
}
function readBearerToken(headerValue) {
    if (!headerValue) {
        return undefined;
    }
    const [scheme, token] = headerValue.split(" ", 2);
    if ((scheme === null || scheme === void 0 ? void 0 : scheme.toLowerCase()) !== "bearer" || !token) {
        return undefined;
    }
    return token;
}
function isLocalServerRequest(hostname, forwardedHost) {
    const candidates = [hostname, forwardedHost].filter((value) => Boolean(value));
    return candidates.some((value) => value.startsWith("localhost") || value.startsWith("127.0.0.1"));
}
function isAuthorizedServerRequest(request) {
    var _a;
    const secret = getIntakeSecret();
    const headerSecret = (_a = request.get("x-admin-secret")) !== null && _a !== void 0 ? _a : readBearerToken(request.get("authorization"));
    if (secret && headerSecret === secret) {
        return true;
    }
    if (process.env.FUNCTIONS_EMULATOR === "true" && isLocalServerRequest(request.hostname, request.get("x-forwarded-host"))) {
        return true;
    }
    return false;
}
function parseGenerationRequestBody(body) {
    if (!body) {
        return {};
    }
    if (typeof body === "string") {
        return JSON.parse(body);
    }
    if (typeof body === "object") {
        return body;
    }
    return {};
}
function toCreateJobOptions(body, requestedBy) {
    var _a, _b, _c;
    if (!Array.isArray(body.bundles) || body.bundles.length === 0) {
        throw new Error("At least one bundle is required.");
    }
    const invalidBundles = body.bundles.filter((bundle) => !(0, bundleIds_1.isValidBundleId)(bundle));
    if (invalidBundles.length > 0) {
        throw new Error(`Invalid bundle IDs: ${invalidBundles.join(", ")}`);
    }
    if (!Number.isInteger(body.count) || ((_a = body.count) !== null && _a !== void 0 ? _a : 0) < 1 || ((_b = body.count) !== null && _b !== void 0 ? _b : 0) > 50) {
        throw new Error("count must be an integer between 1 and 50.");
    }
    const count = body.count;
    if (count === undefined) {
        throw new Error("count must be an integer between 1 and 50.");
    }
    const configValidation = (0, config_validator_1.validateConfig)(body.modelConfig);
    logger.info(`[generate] Config valid: ${configValidation.valid}`, { errors: configValidation.errors });
    if (!configValidation.valid) {
        (0, config_validator_1.logConfigStatus)();
        throw new Error("Scenario generation is misconfigured. " + configValidation.errors.join("; "));
    }
    return Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ bundles: body.bundles, count, mode: body.mode === "news" ? "news" : "manual", requestedBy, priority: (_c = body.priority) !== null && _c !== void 0 ? _c : "normal", executionTarget: body.executionTarget === "n8n" ? "n8n" : "cloud_function", currentPhase: "queued", currentMessage: body.executionTarget === "n8n" ? "Queued for n8n orchestration" : "Queued for background processing" }, (body.lowLatencyMode !== undefined ? { lowLatencyMode: body.lowLatencyMode } : {})), (body.distributionConfig !== undefined ? { distributionConfig: body.distributionConfig } : {})), (body.dryRun !== undefined ? { dryRun: body.dryRun } : {})), (body.newsContext !== undefined ? { newsContext: body.newsContext } : {})), (body.region !== undefined ? { region: body.region } : {})), (body.regions !== undefined ? { regions: body.regions } : {})), (body.scopeTier !== undefined ? { scopeTier: body.scopeTier } : {})), (body.scopeKey !== undefined ? { scopeKey: body.scopeKey } : {})), (body.clusterId !== undefined ? { clusterId: body.clusterId } : {})), (body.exclusivityReason !== undefined ? { exclusivityReason: body.exclusivityReason } : {})), (body.applicable_countries !== undefined ? { applicable_countries: body.applicable_countries } : {})), (body.sourceKind !== undefined ? { sourceKind: body.sourceKind } : {})), (body.modelConfig !== undefined ? { modelConfig: body.modelConfig } : {})), (body.description !== undefined ? { description: body.description } : {}));
}
async function enqueueGenerationJob(body, requestedBy) {
    const options = toCreateJobOptions(body, requestedBy);
    return (0, background_jobs_1.createGenerationJob)(db, options);
}
exports.submitGenerationJob = (0, https_1.onRequest)({
    cors: true,
    timeoutSeconds: 60,
    memory: "256MiB",
    secrets: ["GENERATION_INTAKE_SECRET", "OPENAI_API_KEY"],
}, async (request, response) => {
    if (request.method !== "POST") {
        response.status(405).json({ error: "Method not allowed" });
        return;
    }
    if (!isAuthorizedServerRequest(request)) {
        response.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        const body = parseGenerationRequestBody(request.body);
        const requestedBy = request.get("x-request-origin") || "server-intake";
        const result = await enqueueGenerationJob(body, requestedBy);
        response.status(202).json(Object.assign({ success: true, queued: true }, result));
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        logger.error("submitGenerationJob failed", error);
        response.status(message === "Internal server error" ? 500 : 400).json({ error: message });
    }
});
exports.getGenerationJob = (0, https_1.onRequest)({
    cors: true,
    timeoutSeconds: 60,
    memory: "256MiB",
    secrets: ["GENERATION_INTAKE_SECRET", "OPENAI_API_KEY"],
}, async (request, response) => {
    if (request.method !== "GET") {
        response.status(405).json({ error: "Method not allowed" });
        return;
    }
    if (!isAuthorizedServerRequest(request)) {
        response.status(401).json({ error: "Unauthorized" });
        return;
    }
    const jobId = request.query.jobId;
    if (typeof jobId !== "string" || !jobId.trim()) {
        response.status(400).json({ error: "jobId is required" });
        return;
    }
    try {
        const job = await (0, background_jobs_1.getJobStatus)(db, jobId.trim());
        if (!job) {
            response.status(404).json({ error: "Job not found" });
            return;
        }
        response.status(200).json({
            success: true,
            jobId: jobId.trim(),
            job,
        });
    }
    catch (error) {
        logger.error("getGenerationJob failed", error);
        response.status(500).json({ error: "Internal server error" });
    }
});
exports.rebuildScenarioBundles = (0, https_1.onCall)({
    cors: true,
    enforceAppCheck: false,
    timeoutSeconds: 540,
    memory: "1GiB",
}, async (request) => {
    if (!isAdminUser(request)) {
        throw new Error("Admin privileges required");
    }
    const { bundleId } = request.data || {};
    const { exportBundle, exportAllBundles } = await Promise.resolve().then(() => __importStar(require("./bundle-exporter")));
    if (bundleId) {
        if (!(0, bundleIds_1.isValidBundleId)(bundleId)) {
            throw new Error(`Invalid bundle ID: ${bundleId}`);
        }
        const count = await exportBundle(bundleId);
        return { success: true, summary: { [bundleId]: count } };
    }
    const summary = await exportAllBundles();
    return { success: true, summary };
});
exports.getScenarios = (0, https_1.onCall)({
    cors: true,
    enforceAppCheck: false,
}, async (request) => {
    const { hideNewsScenarios = false, limit = 100 } = request.data || {};
    try {
        const { fetchScenarios } = await Promise.resolve().then(() => __importStar(require("./storage")));
        const scenarios = await fetchScenarios(hideNewsScenarios, limit);
        return { success: true, scenarios, count: scenarios.length };
    }
    catch (error) {
        logger.error("Error fetching scenarios:", error);
        throw new Error("Failed to fetch scenarios");
    }
});
exports.generateScenariosManual = (0, https_1.onCall)({
    cors: true,
    enforceAppCheck: false,
    timeoutSeconds: 60,
    memory: "256MiB",
}, async (request) => {
    var _a, _b, _c;
    if (!isAdminUser(request)) {
        throw new Error("Admin privileges required");
    }
    const userEmail = ((_b = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.email) || "";
    const userId = ((_c = request.auth) === null || _c === void 0 ? void 0 : _c.uid) || "unknown";
    logger.info(`Manual generation request from: ${userId} (${userEmail})`);
    const result = await enqueueGenerationJob(parseGenerationRequestBody(request.data), userEmail || userId || "generateScenariosManual");
    return Object.assign({ success: true, queued: true }, result);
});
//# sourceMappingURL=index.js.map