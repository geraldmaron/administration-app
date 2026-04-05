import { onCall, onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { type CreateJobOptions, createGenerationJob, getJobStatus } from "./background-jobs";
import { isValidBundleId, type BundleId } from "./data/schemas/bundleIds";
import { validateConfig, logConfigStatus } from "./lib/config-validator";
import { hasMeaningfulModelConfig, fetchOllamaModels, buildOllamaModelConfig, normalizeModelConfig } from "./lib/generation-models";

export { onScenarioJobCreated, recoverZombieJobs } from "./background-jobs";
export { dailyNewsToScenarios } from "./news-to-scenarios";
export { processGenerationBundle, updateJobProgress } from "./generation-services";
export { resolveAction } from "./action-resolution";

if (!admin.apps.length) {
    admin.initializeApp();
}

interface CallableRequestLike {
    auth?: {
        uid: string;
        token?: {
            email?: string;
        };
    };
}

interface GenerationRequestBody {
    bundles?: string[];
    count?: number;
    lowLatencyMode?: boolean;
    distributionConfig?: CreateJobOptions["distributionConfig"];
    region?: string;
    regions?: string[];
    scopeTier?: CreateJobOptions["scopeTier"];
    scopeKey?: string;
    clusterId?: string;
    exclusivityReason?: CreateJobOptions["exclusivityReason"];
    applicable_countries?: string[];
    sourceKind?: CreateJobOptions["sourceKind"];
    description?: string;
    priority?: CreateJobOptions["priority"];
    modelConfig?: CreateJobOptions["modelConfig"];
    dryRun?: boolean;
    newsContext?: CreateJobOptions["newsContext"];
    mode?: "manual" | "news";
    executionTarget?: "cloud_function" | "n8n";
}

const db = admin.firestore();

function isAdminUser(request: CallableRequestLike): boolean {
    if (!request.auth) {
        return false;
    }

    const userEmail = request.auth.token?.email || "";
    const userId = request.auth.uid;
    const adminUid = process.env.ADMIN_UID;
    const adminEmail = process.env.ADMIN_EMAIL;

    return !((adminUid || adminEmail) && userId !== adminUid && userEmail !== adminEmail);
}

function getIntakeSecret(): string | undefined {
    return process.env.GENERATION_INTAKE_SECRET || process.env.ADMIN_SECRET;
}

function readBearerToken(headerValue?: string): string | undefined {
    if (!headerValue) {
        return undefined;
    }

    const [scheme, token] = headerValue.split(" ", 2);
    if (scheme?.toLowerCase() !== "bearer" || !token) {
        return undefined;
    }

    return token;
}

function isLocalServerRequest(hostname?: string, forwardedHost?: string): boolean {
    const candidates = [hostname, forwardedHost].filter((value): value is string => Boolean(value));
    return candidates.some((value) => {
        const normalized = value.split(':', 1)[0]?.toLowerCase() ?? value.toLowerCase();
        return normalized === "localhost" || normalized === "127.0.0.1" || normalized.endsWith(".localhost");
    });
}

function isAuthorizedServerRequest(request: { get(name: string): string | undefined; hostname?: string }): boolean {
    const secret = getIntakeSecret();
    const headerSecret = request.get("x-admin-secret") ?? readBearerToken(request.get("authorization"));

    if (secret && headerSecret === secret) {
        return true;
    }

    if (process.env.FUNCTIONS_EMULATOR === "true" && isLocalServerRequest(request.hostname, request.get("x-forwarded-host"))) {
        return true;
    }

    return false;
}

function parseGenerationRequestBody(body: unknown): GenerationRequestBody {
    if (!body) {
        return {};
    }

    if (typeof body === "string") {
        return JSON.parse(body) as GenerationRequestBody;
    }

    if (typeof body === "object") {
        return body as GenerationRequestBody;
    }

    return {};
}

function toCreateJobOptions(body: GenerationRequestBody, requestedBy: string): CreateJobOptions {
    if (!Array.isArray(body.bundles) || body.bundles.length === 0) {
        throw new Error("At least one bundle is required.");
    }

    const invalidBundles = body.bundles.filter((bundle) => !isValidBundleId(bundle));
    if (invalidBundles.length > 0) {
        throw new Error(`Invalid bundle IDs: ${invalidBundles.join(", ")}`);
    }

    if (!Number.isInteger(body.count) || (body.count ?? 0) < 1 || (body.count ?? 0) > 50) {
        throw new Error("count must be an integer between 1 and 50.");
    }

    const count = body.count;
    if (count === undefined) {
        throw new Error("count must be an integer between 1 and 50.");
    }

    const configValidation = validateConfig(body.modelConfig);
    logger.info(`[generate] Config valid: ${configValidation.valid}`, { errors: configValidation.errors });
    if (!configValidation.valid) {
        logConfigStatus();
        throw new Error("Scenario generation is misconfigured. " + configValidation.errors.join("; "));
    }

    return {
        bundles: body.bundles as BundleId[],
        count,
        mode: body.mode === "news" ? "news" : "manual",
        requestedBy,
        priority: body.priority ?? "normal",
        executionTarget: body.executionTarget === "n8n" ? "n8n" : "cloud_function",
        currentPhase: "queued",
        currentMessage: body.executionTarget === "n8n" ? "Queued for n8n orchestration" : "Queued for background processing",
        ...(body.lowLatencyMode !== undefined ? { lowLatencyMode: body.lowLatencyMode } : {}),
        ...(body.distributionConfig !== undefined ? { distributionConfig: body.distributionConfig } : {}),
        ...(body.dryRun !== undefined ? { dryRun: body.dryRun } : {}),
        ...(body.newsContext !== undefined ? { newsContext: body.newsContext } : {}),
        ...(body.region !== undefined ? { region: body.region } : {}),
        ...(body.regions !== undefined ? { regions: body.regions } : {}),
        ...(body.scopeTier !== undefined ? { scopeTier: body.scopeTier } : {}),
        ...(body.scopeKey !== undefined ? { scopeKey: body.scopeKey } : {}),
        ...(body.clusterId !== undefined ? { clusterId: body.clusterId } : {}),
        ...(body.exclusivityReason !== undefined ? { exclusivityReason: body.exclusivityReason } : {}),
        ...(body.applicable_countries !== undefined ? { applicable_countries: body.applicable_countries } : {}),
        ...(body.sourceKind !== undefined ? { sourceKind: body.sourceKind } : {}),
        ...(body.modelConfig !== undefined ? { modelConfig: body.modelConfig } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
    };
}

async function enqueueGenerationJob(body: GenerationRequestBody, requestedBy: string) {
    let resolvedModelConfig = normalizeModelConfig(body.modelConfig as Record<string, unknown>);
    const isDeployed = !process.env.FUNCTIONS_EMULATOR && Boolean(process.env.K_SERVICE);
    if (!hasMeaningfulModelConfig(resolvedModelConfig) && !isDeployed) {
        const configSnap = await db.doc('world_state/generation_config').get();
        const ollamaBaseUrl: string = configSnap.data()?.ollama_base_url || process.env.OLLAMA_BASE_URL || '';
        if (ollamaBaseUrl) {
            const models = await fetchOllamaModels(ollamaBaseUrl);
            if (models.length > 0) {
                resolvedModelConfig = buildOllamaModelConfig(models);
                logger.info('[enqueueGenerationJob] Resolved Ollama default modelConfig', { models: Object.values(resolvedModelConfig) });
            }
        }
    }
    const options = toCreateJobOptions({ ...body, modelConfig: resolvedModelConfig }, requestedBy);
    return createGenerationJob(db, options);
}

export const submitGenerationJob = onRequest({
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

        response.status(202).json({
            success: true,
            queued: true,
            ...result,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        logger.error("submitGenerationJob failed", error);
        response.status(message === "Internal server error" ? 500 : 400).json({ error: message });
    }
});

export const getGenerationJob = onRequest({
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
        const job = await getJobStatus(db, jobId.trim());
        if (!job) {
            response.status(404).json({ error: "Job not found" });
            return;
        }

        response.status(200).json({
            success: true,
            jobId: jobId.trim(),
            job,
        });
    } catch (error) {
        logger.error("getGenerationJob failed", error);
        response.status(500).json({ error: "Internal server error" });
    }
});

export const rebuildScenarioBundles = onCall({
    cors: true,
    enforceAppCheck: false,
    timeoutSeconds: 540,
    memory: "1GiB",
}, async (request) => {
    if (!isAdminUser(request)) {
        throw new Error("Admin privileges required");
    }

    const { bundleId } = request.data || {};
    const { exportBundle, exportAllBundles } = await import("./bundle-exporter");

    if (bundleId) {
        if (!isValidBundleId(bundleId)) {
            throw new Error(`Invalid bundle ID: ${bundleId}`);
        }
        const count = await exportBundle(bundleId);
        return { success: true, summary: { [bundleId]: count } };
    }

    const summary = await exportAllBundles();
    return { success: true, summary };
});

export const getScenarios = onCall({
    cors: true,
    enforceAppCheck: false,
}, async (request) => {
    const { hideNewsScenarios = false, limit = 100 } = request.data || {};

    try {
        const { fetchScenarios } = await import("./storage");
        const scenarios = await fetchScenarios(hideNewsScenarios, limit);
        return { success: true, scenarios, count: scenarios.length };
    } catch (error) {
        logger.error("Error fetching scenarios:", error);
        throw new Error("Failed to fetch scenarios");
    }
});

export const generateScenariosManual = onCall({
    cors: true,
    enforceAppCheck: false,
    timeoutSeconds: 60,
    memory: "256MiB",
}, async (request) => {
    if (!isAdminUser(request)) {
        throw new Error("Admin privileges required");
    }

    const userEmail = request.auth?.token?.email || "";
    const userId = request.auth?.uid || "unknown";

    logger.info(`Manual generation request from: ${userId} (${userEmail})`);

    const result = await enqueueGenerationJob(
        parseGenerationRequestBody(request.data),
        userEmail || userId || "generateScenariosManual"
    );

    return {
        success: true,
        queued: true,
        ...result,
    };
});

export const resolveTagsBatch = onCall({
    cors: true,
    enforceAppCheck: false,
    timeoutSeconds: 540,
    memory: "512MiB",
}, async (request) => {
    if (!isAdminUser(request)) {
        throw new Error("Admin privileges required");
    }

    const { resolveScenarioTags, TAG_RESOLVER_VERSION } = await import("./services/tag-resolver");

    const {
        bundle,
        limit = 100,
        force = false,
        useLLM = false,
    } = request.data || {};

    let query: FirebaseFirestore.Query = db.collection("scenarios")
        .where("is_active", "==", true);

    if (bundle && isValidBundleId(bundle)) {
        query = query.where("metadata.bundle", "==", bundle);
    }

    query = query.limit(limit);

    const snapshot = await query.get();
    let resolved = 0;
    let skipped = 0;
    let failed = 0;

    const batch = db.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
        const scenario = doc.data();

        const existingResolution = scenario.metadata?.tagResolution;
        if (!force) {
            if (existingResolution?.status === "manual") {
                skipped++;
                continue;
            }
            if (
                existingResolution?.status === "resolved" &&
                existingResolution.resolverVersion === TAG_RESOLVER_VERSION
            ) {
                skipped++;
                continue;
            }
        }

        try {
            const result = await resolveScenarioTags(scenario, { force, useLLM });

            batch.update(doc.ref, {
                "metadata.tags": result.tags,
                "metadata.tagResolution": result.resolution,
            });
            batchCount++;
            resolved++;

            if (batchCount >= 400) {
                await batch.commit();
                batchCount = 0;
            }
        } catch (err) {
            logger.error(`Tag resolution failed for ${doc.id}`, err);
            failed++;
        }
    }

    if (batchCount > 0) {
        await batch.commit();
    }

    logger.info(`[resolveTagsBatch] Resolved: ${resolved}, Skipped: ${skipped}, Failed: ${failed}`);

    return {
        success: true,
        total: snapshot.size,
        resolved,
        skipped,
        failed,
        resolverVersion: TAG_RESOLVER_VERSION,
    };
});

