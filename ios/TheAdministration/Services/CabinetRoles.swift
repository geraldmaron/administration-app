/// CabinetRoles
/// Default cabinet role definitions for the application.
/// Swift port of web/src/data/constants/cabinetRoles.ts DEFAULT_CABINET_ROLES.
/// These are static application constants — not loaded from Firebase.

enum CabinetRoles {
    static let DEFAULT_ROLES: [Role] = [
        Role(id: "role_executive",  title: "Vice Leader",       category: "Executive",  priority: 1),
        Role(id: "role_diplomacy",  title: "Foreign Minister",  category: "Diplomacy",  priority: 2),
        Role(id: "role_defense",    title: "Defense Minister",  category: "Defense",    priority: 3),
        Role(id: "role_economy",    title: "Finance Minister",  category: "Economy",    priority: 4),
        Role(id: "role_justice",    title: "Justice Minister",  category: "Justice",    priority: 5),
        Role(id: "role_health",     title: "Health Minister",   category: "Health",     priority: 6),
        Role(id: "role_commerce",   title: "Commerce Minister", category: "Commerce",   priority: 7),
        Role(id: "role_labor",      title: "Labor Minister",    category: "Labor",      priority: 8),
        Role(id: "role_interior",   title: "Interior Minister", category: "Interior",   priority: 9),
        Role(id: "role_energy",     title: "Energy Minister",   category: "Energy",     priority: 10),
        Role(id: "role_environment",title: "Environment Minister", category: "Environment", priority: 11),
        Role(id: "role_transport",  title: "Transport Minister",category: "Transport",  priority: 12),
        Role(id: "role_education",  title: "Education Minister",category: "Education",  priority: 13),
    ]

    private static let roleTokenKeys: [String: String] = [
        "role_executive":    "vice_leader",
        "role_diplomacy":    "foreign_affairs_role",
        "role_defense":      "defense_role",
        "role_economy":      "finance_role",
        "role_justice":      "justice_role",
        "role_health":       "health_role",
        "role_commerce":     "commerce_role",
        "role_labor":        "labor_role",
        "role_interior":     "interior_role",
        "role_energy":       "energy_role",
        "role_environment":  "environment_role",
        "role_transport":    "transport_role",
        "role_education":    "education_role",
    ]

    static func title(for roleId: String, country: Country?) -> String {
        guard let country,
              let tokenKey = roleTokenKeys[roleId],
              let title = country.tokens?[tokenKey], !title.isEmpty else {
            return DEFAULT_ROLES.first { $0.id == roleId }?.title ?? roleId
        }
        return title
    }
}
