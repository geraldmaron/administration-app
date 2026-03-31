import Foundation

class RateLimitEntry {
    var count: Int
    let resetTime: Date
    
    init(count: Int, resetTime: Date) {
        self.count = count
        self.resetTime = resetTime
    }
}

class RateLimiter {
    private var requests: [String: RateLimitEntry] = [:]
    private let windowMs: Int
    private let maxRequests: Int
    
    init(maxRequests: Int = 10, windowMs: Int = 60000) {
        self.maxRequests = maxRequests
        self.windowMs = windowMs
    }
    
    func check(identifier: String) -> (allowed: Bool, remaining: Int, resetTime: Date) {
        let now = Date()
        
        // Clean up expired entries periodically
        if Int.random(in: 0..<10) == 0 {
            cleanup(now: now)
        }
        
        guard let entry = requests[identifier], now < entry.resetTime else {
            // Create new entry or reset expired entry
            let resetTime = now.addingTimeInterval(TimeInterval(windowMs) / 1000.0)
            requests[identifier] = RateLimitEntry(count: 1, resetTime: resetTime)
            return (allowed: true, remaining: maxRequests - 1, resetTime: resetTime)
        }
        
        if entry.count >= maxRequests {
            return (allowed: false, remaining: 0, resetTime: entry.resetTime)
        }
        
        // Increment count on existing entry
        entry.count += 1
        requests[identifier] = entry
        
        return (allowed: true, remaining: maxRequests - entry.count, resetTime: entry.resetTime)
    }
    
    private func cleanup(now: Date) {
        requests = requests.filter { _, entry in
            now < entry.resetTime
        }
    }
    
    func getRemaining(identifier: String) -> Int {
        let now = Date()
        guard let entry = requests[identifier], now < entry.resetTime else {
            return maxRequests
        }
        return max(0, maxRequests - entry.count)
    }
}

// Different rate limits for different operations
let scenarioRateLimiter = RateLimiter(
    maxRequests: 5,  // 5 requests per window
    windowMs: 60000   // 1 minute window
)

let advisorRateLimiter = RateLimiter(
    maxRequests: 20, // 20 requests per window
    windowMs: 60000  // 1 minute window
)

