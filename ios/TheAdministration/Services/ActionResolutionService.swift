import Foundation
import FirebaseAuth
import FirebaseCore

struct ActionResolutionRequest: Encodable {
    let actionCategory: String
    let actionType: String?
    let targetCountryId: String?
    let severity: String?
    let freeFormCommand: String?
    let countryId: String
    let countryName: String
    let leaderTitle: String?
    let targetCountryName: String?
    let turn: Int
    let maxTurns: Int
    let phase: String
    let metrics: [String: Double]
    let relationship: Double?
    let relationshipType: String?
    let recentActions: [String]?
    let governmentCategory: String?
    let playerApproach: String?
    let targetMilitaryStrength: Double?
    let targetCyberCapability: Double?
    let targetNuclearCapable: Bool?
}

struct ActionResolutionMetricDelta: Decodable {
    let metricId: String
    let delta: Double
}

struct ActionResolutionResponsePayload: Decodable {
    let headline: String
    let summary: String
    let context: String
    let metricDeltas: [ActionResolutionMetricDelta]
    let relationshipDelta: Double
    let targetMilitaryStrengthDelta: Double?
    let targetCyberCapabilityDelta: Double?
    let newsCategory: String
    let newsTags: [String]
    let isAtrocity: Bool?
}

struct ActionResolutionResult: Decodable {
    let success: Bool
    let result: ActionResolutionResponsePayload?
    let error: String?
    let fallback: Bool?
}

class ActionResolutionService {
    static let shared = ActionResolutionService()

    private var baseURL: String {
        #if DEBUG
        if ProcessInfo.processInfo.environment["FUNCTIONS_EMULATOR"] == "true" {
            return "http://localhost:5001/the-administration-3a072/us-central1"
        }
        #endif
        guard let app = FirebaseApp.app(),
              let projectID = app.options.projectID else {
            return "https://us-central1-the-administration-3a072.cloudfunctions.net"
        }
        return "https://us-central1-\(projectID).cloudfunctions.net"
    }

    private let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 15
        config.timeoutIntervalForResource = 20
        return URLSession(configuration: config)
    }()

    func resolve(_ request: ActionResolutionRequest) async -> ActionResolutionResult? {
        guard let url = URL(string: "\(baseURL)/resolveAction") else {
            AppLogger.warning("[ActionResolution] Invalid URL")
            return nil
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = try? await authToken() {
            urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        do {
            urlRequest.httpBody = try JSONEncoder().encode(request)
        } catch {
            AppLogger.warning("[ActionResolution] Failed to encode request: \(error)")
            return nil
        }

        do {
            let (data, response) = try await session.data(for: urlRequest)
            let status = (response as? HTTPURLResponse)?.statusCode ?? -1

            guard status == 200 else {
                AppLogger.warning("[ActionResolution] HTTP \(status)")
                return nil
            }

            let decoded = try JSONDecoder().decode(ActionResolutionResult.self, from: data)
            return decoded
        } catch {
            AppLogger.warning("[ActionResolution] Network error: \(error)")
            return nil
        }
    }

    private func authToken() async throws -> String? {
        guard let user = Auth.auth().currentUser else { return nil }
        return try await user.getIDToken()
    }
}
