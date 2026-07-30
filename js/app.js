import { supabase } from "./supabase.js";

const user = JSON.parse(
sessionStorage.getItem("msa_user") || "null"
);

if (!user) {
location.href = "login.html";
throw new Error("Not authenticated");
}

const content = document.querySelector("#content");
const title = document.querySelector("#pageTitle");
const welcome = document.querySelector("#welcomeText");

// ============================================================
// OUTILS
// ============================================================

function esc(value) {
return String(value ?? "").replace(
/[&<>"']/g,
char => ({
"&": "&",
"<": "<",
">": ">",
'"': """,
"'": "'"
})[char]
);
}

// ============================================================
// UTILISATEUR CONNECTÉ
// ============================================================

let currentRoles = [];

async function loadCurrentUserRoles() {

```
const { data, error } = await supabase
    .from("user_roles")
    .select(`
        role_id,
        roles (
            id,
            name,
            description,
            icon,
            is_admin
        )
    `)
    .eq("user_id", user.id);

if (error) {
    console.error(
        "Erreur chargement des rôles :",
        error
    );

    currentRoles = [];
    return;
}

currentRoles = (data || [])
    .map(item => item.roles)
    .filter(Boolean);
```

}

// ============================================================
// ADMIN
// ============================================================

function isAdmin() {

```
return currentRoles.some(
    role => role.is_admin === true
);
```

}

// ============================================================
// AFFICHAGE DU PROFIL
// ============================================================

function renderUserMini() {

```
const userMini =
    document.querySelector("#userMini");

if (!userMini) {
    return;
}

const roleBadges =
    currentRoles.length

        ? currentRoles
            .map(role => {

                return `
                    <span class="user-role">
                        ${esc(role.icon || "")}
                        ${esc(role.name)}
                    </span>
                `;

            })
            .join(" • ")

        : `
            <span class="user-role">
                Utilisateur
            </span>
        `;


userMini.innerHTML = `

    <div class="user-mini">

        <strong>
            ${esc(user.display_name)}
        </strong>

        <div class="user-roles">

            ${roleBadges}

        </div>

    </div>

`;
```

}

// ============================================================
// INITIALISATION UTILISATEUR
// ============================================================

async function initializeUser() {

```
await loadCurrentUserRoles();

renderUserMini();

if (welcome) {

    welcome.textContent =
        `Bienvenue, ${user.display_name}`;

}

// Les sections d'administration
// sont visibles uniquement pour les admins.

if (!isAdmin()) {

    document
        .querySelectorAll(".admin-only")
        .forEach(element => {

            element.style.display = "none";

        });

}
```

}

// ============================================================
// DÉCONNEXION
// ============================================================

const logoutBtn =
document.querySelector("#logoutBtn");

if (logoutBtn) {

```
logoutBtn.onclick = async () => {

    sessionStorage.removeItem(
        "msa_user"
    );

    await supabase.auth.signOut();

    location.href =
        "login.html";

};
```

}

// ============================================================
// MENU MOBILE
// ============================================================

const mobileMenu =
document.querySelector("#mobileMenu");

if (mobileMenu) {

```
mobileMenu.onclick = () => {

    document
        .querySelector(".sidebar")
        ?.classList.toggle("open");

};
```

}

// ============================================================
// NAVIGATION
// ============================================================

document
.querySelectorAll(".nav-item")
.forEach(link => {

```
    link.onclick = () => {

        document
            .querySelectorAll(".nav-item")
            .forEach(item => {

                item.classList.remove(
                    "active"
                );

            });


        link.classList.add(
            "active"
        );


        load(
            link.dataset.page
        );


        document
            .querySelector(".sidebar")
            ?.classList.remove(
                "open"
            );

    };

});
```

// ============================================================
// CHARGEMENT DES PAGES
// ============================================================

async function load(page) {

```
const pageLink =
    document.querySelector(
        `[data-page="${page}"]`
    );


title.textContent =
    pageLink
        ?.querySelector("span")
        ?.textContent
    || "Tableau de bord";


if (page === "dashboard") {

    return dashboard();

}


if (page === "requests") {

    return requests();

}


if (page === "users") {

    return users();

}


if (page === "permissions") {

    return permissions();

}


if (page === "roles") {

    return roles();

}


return generic(page);
```

}

// ============================================================
// TABLEAU DE BORD
// ============================================================

async function dashboard() {

```
const [
    marriagesResult,
    sanctionsResult,
    blacklistResult,
    documentsResult
] = await Promise.all([

    supabase
        .from("mariages")
        .select("*", {
            count: "exact",
            head: true
        }),

    supabase
        .from("sanctions")
        .select("*", {
            count: "exact",
            head: true
        }),

    supabase
        .from("blacklist")
        .select("*", {
            count: "exact",
            head: true
        })
        .eq(
            "active",
            true
        ),

    supabase
        .from("documents")
        .select("*", {
            count: "exact",
            head: true
        })

]);


content.innerHTML = `

    <div class="cards">

        <div class="stat-card">
            <small>Mariages</small>
            <strong>
                ${marriagesResult.count ?? 0}
            </strong>
        </div>


        <div class="stat-card">
            <small>Sanctions</small>
            <strong>
                ${sanctionsResult.count ?? 0}
            </strong>
        </div>


        <div class="stat-card">
            <small>Blacklist actives</small>
            <strong>
                ${blacklistResult.count ?? 0}
            </strong>
        </div>


        <div class="stat-card">
            <small>Documents</small>
            <strong>
                ${documentsResult.count ?? 0}
            </strong>
        </div>

    </div>


    <div class="dashboard-grid">

        <div class="panel">

            <h2>
                Activité récente
            </h2>

            <div
                id="recent"
                class="empty"
            >
                Chargement…
            </div>

        </div>


        <div class="panel">

            <h2>
                Prochains événements
            </h2>

            <div
                id="events"
                class="empty"
            >
                Chargement…
            </div>

        </div>

    </div>

`;


const {
    data: logs
} = await supabase
    .from("audit_logs")
    .select("*")
    .order(
        "created_at",
        {
            ascending: false
        }
    )
    .limit(8);


const recent =
    document.querySelector(
        "#recent"
    );


if (recent) {

    recent.innerHTML =
        logs?.length

            ? logs
                .map(log => `

                    <div class="event">

                        <b>
                            ${esc(
                                log.action
                            )}
                        </b>

                        <small>
                            ${
                                new Date(
                                    log.created_at
                                ).toLocaleString(
                                    "fr-FR"
                                )
                            }
                        </small>

                    </div>

                `)
                .join("")

            : "Aucune activité";

}


const {
    data: events
} = await supabase
    .from("agenda")
    .select("*")
    .gte(
        "event_date",
        new Date().toISOString()
    )
    .order(
        "event_date",
        {
            ascending: true
        }
    )
    .limit(5);


const eventsElement =
    document.querySelector(
        "#events"
    );


if (eventsElement) {

    eventsElement.innerHTML =
        events?.length

            ? events
                .map(event => `

                    <div class="event">

                        <b>
                            ${esc(
                                event.title
                            )}
                        </b>

                        <small>
                            ${
                                new Date(
                                    event.event_date
                                ).toLocaleString(
                                    "fr-FR"
                                )
                            }
                        </small>

                    </div>

                `)
                .join("")

            : "Aucun événement";

}
```

}

// ============================================================
// PAGES PRINCIPALES
// ============================================================

async function generic(page) {

```
const map = {

    mariages: [
        "Mariages",
        "mariages"
    ],

    noms: [
        "Changements de nom",
        "name_changes"
    ],

    sanctions: [
        "Sanctions",
        "sanctions"
    ],

    blacklist: [
        "Blacklist",
        "blacklist"
    ],

    agenda: [
        "Agenda",
        "agenda"
    ],

    documents: [
        "Documents",
        "documents"
    ]

};


const config =
    map[page];


if (!config) {

    content.innerHTML = `

        <div class="panel">

            <div class="empty">

                Page introuvable.

            </div>

        </div>

    `;

    return;

}


const [
    label,
    table
] = config;


const {
    data,
    error
} = await supabase
    .from(table)
    .select("*")
    .order(
        "created_at",
        {
            ascending: false
        }
    )
    .limit(100);


if (error) {

    content.innerHTML = `

        <div class="panel">

            <div class="empty">

                ${esc(
                    error.message
                )}

            </div>

        </div>

    `;

    return;

}


content.innerHTML = `

    <div class="page-intro">

        <h2>
            ${label}
        </h2>

        <p class="muted">
            Données partagées.
        </p>

    </div>


    <div class="toolbar">

        <div class="toolbar-left">

            <input
                class="search"
                id="search"
                placeholder="Rechercher…"
            >

        </div>


        <button
            class="primary-btn"
            id="add"
        >
            + Ajouter
        </button>

    </div>


    <div class="panel table-wrap">

        <table class="table">

            <thead>

                <tr>

                    <th>
                        Informations
                    </th>

                    <th>
                        Créé le
                    </th>

                    <th>
                        Actions
                    </th>

                </tr>

            </thead>


            <tbody id="rows"></tbody>

        </table>

    </div>

`;


renderRows(
    data || [],
    table
);


document.querySelector(
    "#add"
).onclick = () => {

    openAdd(
        table,
        label
    );

};


document.querySelector(
    "#search"
).oninput = event => {

    const value =
        event.target.value
            .toLowerCase();


    renderRows(

        (data || [])
            .filter(item =>

                JSON.stringify(item)
                    .toLowerCase()
                    .includes(value)

            ),

        table

    );

};
```

}

// ============================================================
// AFFICHAGE DES DONNÉES
// ============================================================

function renderRows(
rows,
table
) {

```
const rowsElement =
    document.querySelector(
        "#rows"
    );


if (!rowsElement) {

    return;

}


rowsElement.innerHTML =

    rows.length

        ? rows
            .map(item => `

                <tr>

                    <td>

                        ${esc(
                            JSON.stringify(
                                item
                            )
                            .replace(
                                /[{}"]/g,
                                ""
                            )
                            .slice(
                                0,
                                180
                            )
                        )}

                    </td>


                    <td>

                        ${
                            item.created_at

                                ? new Date(
                                    item.created_at
                                ).toLocaleDateString(
                                    "fr-FR"
                                )

                                : "—"
                        }

                    </td>


                    <td>

                        <div class="actions">

                            <button
                                class="secondary-btn"
                                data-edit="${item.id}"
                            >
                                Modifier
                            </button>


                            <button
                                class="danger-btn"
                                data-del="${item.id}"
                            >
                                Supprimer
                            </button>

                        </div>

                    </td>

                </tr>

            `)
            .join("")

        : `

            <tr>

                <td colspan="3">

                    <div class="empty">

                        Aucune donnée

                    </div>

                </td>

            </tr>

        `;


document
    .querySelectorAll(
        "[data-del]"
    )
    .forEach(button => {

        button.onclick = async () => {

            if (
                !confirm(
                    "Supprimer cet élément ?"
                )
            ) {

                return;

            }


            const {
                error
            } = await supabase
                .from(table)
                .delete()
                .eq(
                    "id",
                    button.dataset.del
                );


            if (error) {

                alert(
                    error.message
                );

                return;

            }


            generic(
                getPageFromTable(
                    table
                )
            );

        };

    });
```

}

// ============================================================
// AJOUTER UN ÉLÉMENT
// ============================================================

function openAdd(
table,
label
) {

```
document.querySelector(
    "#modalRoot"
).innerHTML = `

    <div class="modal-backdrop">

        <div class="modal">

            <div class="modal-head">

                <h2>
                    Ajouter — ${label}
                </h2>

                <button
                    class="close"
                    type="button"
                >
                    ×
                </button>

            </div>


            <form id="addForm">

                <label>

                    Titre / nom

                    <input
                        id="title"
                        required
                    >

                </label>


                <label>

                    Détails

                    <textarea
                        id="details"
                        rows="5"
                    ></textarea>

                </label>


                <button
                    class="primary-btn"
                    type="submit"
                >
                    Enregistrer
                </button>

            </form>

        </div>

    </div>

`;


document.querySelector(
    "#modalRoot .close"
).onclick = () => {

    document.querySelector(
        "#modalRoot"
    ).innerHTML = "";

};


document.querySelector(
    "#addForm"
).onsubmit = async event => {

    event.preventDefault();


    const payload = {

        title:
            document.querySelector(
                "#title"
            ).value.trim(),

        details:
            document.querySelector(
                "#details"
            ).value.trim(),

        created_by:
            user.id

    };


    const {
        error
    } = await supabase
        .from(table)
        .insert(payload);


    if (error) {

        alert(
            error.message
        );

        return;

    }


    document.querySelector(
        "#modalRoot"
    ).innerHTML = "";


    generic(
        getPageFromTable(
            table
        )
    );

};
```

}

// ============================================================
// TABLE → PAGE
// ============================================================

function getPageFromTable(
table
) {

```
const map = {

    mariages:
        "mariages",

    name_changes:
        "noms",

    sanctions:
        "sanctions",

    blacklist:
        "blacklist",

    agenda:
        "agenda",

    documents:
        "documents"

};


return map[table] ||
    "dashboard";
```

}

// ============================================================
// DEMANDES DE COMPTES
// ============================================================

async function requests() {

```
if (!isAdmin()) {

    content.innerHTML = `

        <div class="panel">

            <div class="empty">

                Accès refusé.

            </div>

        </div>

    `;

    return;

}


const {
    data,
    error
} = await supabase
    .from("account_requests")
    .select("*")
    .order(
        "created_at",
        {
            ascending: false
        }
    );


if (error) {

    content.innerHTML = `

        <div class="panel">

            <div class="empty">

                ${esc(
                    error.message
                )}

            </div>

        </div>

    `;

    return;

}


content.innerHTML = `

    <div class="page-intro">

        <h2>
            Demandes de comptes
        </h2>

        <p class="muted">
            Validez ou refusez les demandes d'accès.
        </p>

    </div>


    <div class="panel table-wrap">

        <table class="table">

            <thead>

                <tr>

                    <th>
                        Prénom
                    </th>

                    <th>
                        Nom
                    </th>

                    <th>
                        Identifiant
                    </th>

                    <th>
                        Motif
                    </th>

                    <th>
                        Statut
                    </th>

                    <th>
                        Actions
                    </th>

                </tr>

            </thead>


            <tbody>

                ${
                    (data || [])
                        .map(request => `

                            <tr>

                                <td>
                                    ${esc(
                                        request.first_name
                                    )}
                                </td>

                                <td>
                                    ${esc(
                                        request.last_name
                                    )}
                                </td>

                                <td>
                                    ${esc(
                                        request.username
                                    )}
                                </td>

                                <td>
                                    ${esc(
                                        request.reason ||
                                        "—"
                                    )}
                                </td>

                                <td>

                                    <span class="badge">

                                        ${esc(
                                            request.status
                                        )}

                                    </span>

                                </td>

                                <td>

                                    ${
                                        request.status ===
                                        "pending"

                                            ? `

                                                <button
                                                    class="primary-btn"
                                                    data-approve="${request.id}"
                                                >
                                                    Accepter
                                                </button>


                                                <button
                                                    class="danger-btn"
                                                    data-reject="${request.id}"
                                                >
                                                    Refuser
                                                </button>

                                            `

                                            : "—"
                                    }

                                </td>

                            </tr>

                        `)
                        .join("")

                }

            </tbody>

        </table>

    </div>

`;


document
    .querySelectorAll(
        "[data-approve]"
    )
    .forEach(button => {

        button.onclick = () => {

            decide(
                button.dataset.approve,
                "approved"
            );

        };

    });


document
    .querySelectorAll(
        "[data-reject]"
    )
    .forEach(button => {

        button.onclick = () => {

            decide(
                button.dataset.reject,
                "rejected"
            );

        };

    });
```

}

// ============================================================
// TRAITER UNE DEMANDE
// ============================================================

async function decide(
id,
status
) {

```
const {
    error
} = await supabase.rpc(
    "review_account_request",
    {
        p_request_id:
            id,

        p_status:
            status,

        p_reviewer_id:
            user.id

    }
);


if (error) {

    alert(
        error.message
    );

    return;

}


requests();
```

}

// ============================================================
// GESTION DES COMPTES
// ============================================================

async function users() {

```
if (!isAdmin()) {

    content.innerHTML = `

        <div class="panel">

            <div class="empty">

                Accès refusé.

            </div>

        </div>

    `;

    return;

}


const {
    data,
    error
} = await supabase
    .from("profiles")
    .select(`
        id,
        username,
        display_name,
        active,
        created_at,
        user_roles (
            roles (
                id,
                name,
                icon,
                is_admin
            )
        )
    `)
    .order(
        "created_at",
        {
            ascending: false
        }
    );


if (error) {

    content.innerHTML = `

        <div class="panel">

            <div class="empty">

                ${esc(
                    error.message
                )}

            </div>

        </div>

    `;

    return;

}


content.innerHTML = `

    <div class="page-intro">

        <h2>
            Comptes
        </h2>

        <p class="muted">
            Gérez les comptes et leurs rôles.
        </p>

    </div>


    <div class="panel table-wrap">

        <table class="table">

            <thead>

                <tr>

                    <th>
                        Utilisateur
                    </th>

                    <th>
                        Nom affiché
                    </th>

                    <th>
                        Rôles
                    </th>

                    <th>
                        Statut
                    </th>

                </tr>

            </thead>


            <tbody>

                ${
                    (data || [])
                        .map(profile => {

                            const roles =
                                (profile.user_roles || [])
                                    .map(
                                        item =>
                                            item.roles
                                    )
                                    .filter(Boolean);


                            return `

                                <tr>

                                    <td>

                                        <strong>
                                            ${esc(
                                                profile.username
                                            )}
                                        </strong>

                                    </td>


                                    <td>

                                        ${esc(
                                            profile.display_name
                                        )}

                                    </td>


                                    <td>

                                        ${
                                            roles.length

                                                ? roles
                                                    .map(role => `

                                                        <span class="user-role">

                                                            ${esc(
                                                                role.icon ||
                                                                ""
                                                            )}

                                                            ${esc(
                                                                role.name
                                                            )}

                                                        </span>

                                                    `)
                                                    .join(" • ")

                                                : "Aucun rôle"
                                        }

                                    </td>


                                    <td>

                                        <span class="badge">

                                            ${
                                                profile.active
                                                    ? "Actif"
                                                    : "Désactivé"
                                            }

                                        </span>

                                    </td>

                                </tr>

                            `;

                        })
                        .join("")

                }

            </tbody>

        </table>

    </div>

`;
```

}

// ============================================================
// GESTION DES RÔLES
// ============================================================

async function roles() {

```
if (!isAdmin()) {

    content.innerHTML = `

        <div class="panel">

            <div class="empty">
                Accès refusé.
            </div>

        </div>

    `;

    return;

}


const {
    data,
    error
} = await supabase
    .from("roles")
    .select("*")
    .order(
        "name"
    );


if (error) {

    content.innerHTML = `

        <div class="panel">

            <div class="empty">

                ${esc(
                    error.message
                )}

            </div>

        </div>

    `;

    return;

}


content.innerHTML = `

    <div class="page-intro">

        <h2>
            Rôles
        </h2>

        <p class="muted">
            Créez, modifiez et supprimez les rôles.
        </p>

    </div>


    <div class="toolbar">

        <button
            class="primary-btn"
            id="createRole"
        >
            + Créer un rôle
        </button>

    </div>


    <div class="panel table-wrap">

        <table class="table">

            <thead>

                <tr>

                    <th>
                        Icône
                    </th>

                    <th>
                        Nom
                    </th>

                    <th>
                        Description
                    </th>

                    <th>
                        Administration
                    </th>

                    <th>
                        Actions
                    </th>

                </tr>

            </thead>


            <tbody>

                ${
                    (data || [])
                        .map(role => `

                            <tr>

                                <td>
                                    ${esc(
                                        role.icon ||
                                        ""
                                    )}
                                </td>

                                <td>
                                    <strong>
                                        ${esc(
                                            role.name
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    ${esc(
                                        role.description ||
                                        "—"
                                    )}
                                </td>

                                <td>

                                    ${
                                        role.is_admin
                                            ? "👑 Oui"
                                            : "Non"
                                    }

                                </td>

                                <td>

                                    <button
                                        class="secondary-btn"
                                        data-edit-role="${role.id}"
                                    >
                                        Modifier
                                    </button>


                                    <button
                                        class="danger-btn"
                                        data-delete-role="${role.id}"
                                    >
                                        Supprimer
                                    </button>

                                </td>

                            </tr>

                        `)
                        .join("")

                }

            </tbody>

        </table>

    </div>

`;


document.querySelector(
    "#createRole"
).onclick = () => {

    openRoleModal();

};


document
    .querySelectorAll(
        "[data-edit-role]"
    )
    .forEach(button => {

        button.onclick = () => {

            const role =
                data.find(
                    item =>
                        item.id ===
                        button.dataset.editRole
                );


            if (role) {

                openRoleModal(
                    role
                );

            }

        };

    });


document
    .querySelectorAll(
        "[data-delete-role]"
    )
    .forEach(button => {

        button.onclick = async () => {

            if (
                !confirm(
                    "Supprimer ce rôle ? Les utilisateurs qui possèdent ce rôle le perdront."
                )
            ) {

                return;

            }


            const {
                error
            } = await supabase
                .from("roles")
                .delete()
                .eq(
                    "id",
                    button.dataset.deleteRole
                );


            if (error) {

                alert(
                    error.message
                );

                return;

            }


            roles();

        };

    });
```

}

// ============================================================
// MODALE RÔLE
// ============================================================

function openRoleModal(
role = null
) {

```
document.querySelector(
    "#modalRoot"
).innerHTML = `

    <div class="modal-backdrop">

        <div class="modal">

            <div class="modal-head">

                <h2>

                    ${
                        role
                            ? "Modifier le rôle"
                            : "Créer un rôle"
                    }

                </h2>


                <button
                    class="close"
                    type="button"
                >
                    ×
                </button>

            </div>


            <form id="roleForm">

                <label>

                    Nom

                    <input
                        id="roleName"
                        value="${esc(
                            role?.name ||
                            ""
                        )}"
                        required
                    >

                </label>


                <label>

                    Description

                    <textarea
                        id="roleDescription"
                        rows="4"
                    >${esc(
                        role?.description ||
                        ""
                    )}</textarea>

                </label>


                <label>

                    Icône

                    <input
                        id="roleIcon"
                        value="${esc(
                            role?.icon ||
                            ""
                        )}"
                        placeholder="Ex : 🏛️"
                    >

                </label>


                <label>

                    <input
                        id="roleAdmin"
                        type="checkbox"
                        ${
                            role?.is_admin
                                ? "checked"
                                : ""
                        }
                    >

                    Ce rôle est administrateur

                </label>


                <button
                    class="primary-btn"
                    type="submit"
                >

                    ${
                        role
                            ? "Enregistrer"
                            : "Créer le rôle"
                    }

                </button>

            </form>

        </div>

    </div>

`;


document.querySelector(
    "#modalRoot .close"
).onclick = () => {

    document.querySelector(
        "#modalRoot"
    ).innerHTML = "";

};


document.querySelector(
    "#roleForm"
).onsubmit = async event => {

    event.preventDefault();


    const payload = {

        name:
            document.querySelector(
                "#roleName"
            ).value.trim(),

        description:
            document.querySelector(
                "#roleDescription"
            ).value.trim(),

        icon:
            document.querySelector(
                "#roleIcon"
            ).value.trim(),

        is_admin:
            document.querySelector(
                "#roleAdmin"
            ).checked

    };


    let result;


    if (role) {

        result =
            await supabase
                .from("roles")
                .update(payload)
                .eq(
                    "id",
                    role.id
                );

    } else {

        result =
            await supabase
                .from("roles")
                .insert(payload);

    }


    if (result.error) {

        alert(
            result.error.message
        );

        return;

    }


    document.querySelector(
        "#modalRoot"
    ).innerHTML = "";


    roles();

};
```

}

// ============================================================
// PERMISSIONS
// ============================================================

async function permissions() {

```
if (!isAdmin()) {

    content.innerHTML = `

        <div class="panel">

            <div class="empty">
                Accès refusé.
            </div>

        </div>

    `;

    return;

}


const {
    data: rolesData
} = await supabase
    .from("roles")
    .select("*")
    .order(
        "name"
    );


const {
    data: permissionsData
} = await supabase
    .from("permissions")
    .select("*")
    .order(
        "name"
    );


content.innerHTML = `

    <div class="page-intro">

        <h2>
            Permissions
        </h2>

        <p class="muted">
            Gérez les permissions accordées à chaque rôle.
        </p>

    </div>


    <div class="panel table-wrap">

        <table class="table">

            <thead>

                <tr>

                    <th>
                        Rôle
                    </th>

                    <th>
                        Permissions
                    </th>

                </tr>

            </thead>


            <tbody>

                ${
                    (rolesData || [])
                        .map(role => `

                            <tr>

                                <td>

                                    <strong>

                                        ${esc(
                                            role.icon ||
                                            ""
                                        )}

                                        ${esc(
                                            role.name
                                        )}

                                    </strong>

                                </td>


                                <td>

                                    ${
                                        role.is_admin

                                            ? "👑 Toutes les permissions"

                                            : (permissionsData || [])
                                                .map(
                                                    permission => `

                                                        <label style="margin-right:15px">

                                                            <input
                                                                type="checkbox"
                                                                data-permission-role="${role.id}"
                                                                data-permission-id="${permission.id}"
                                                            >

                                                            ${esc(
                                                                permission.name
                                                            )}

                                                        </label>

                                                    `
                                                )
                                                .join("")
                                    }

                                </td>

                            </tr>

                        `)
                        .join("")

                }

            </tbody>

        </table>

    </div>

`;
```

}

// ============================================================
// DÉMARRAGE
// ============================================================

async function startApp() {

```
await initializeUser();

await load(
    "dashboard"
);
```

}

startApp();
