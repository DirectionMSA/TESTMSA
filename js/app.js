```javascript
import { supabase } from "./supabase.js";

// ============================================================
// UTILISATEUR CONNECTÉ
// ============================================================

const user = JSON.parse(
    sessionStorage.getItem("msa_user") || "null"
);

if (!user) {
    window.location.href = "login.html";
    throw new Error("Utilisateur non connecté.");
}


// ============================================================
// ELEMENTS PRINCIPAUX
// ============================================================

const content = document.querySelector("#content");
const title = document.querySelector("#pageTitle");
const welcome = document.querySelector("#welcomeText");
const userMini = document.querySelector("#userMini");
const modalRoot = document.querySelector("#modalRoot");


// ============================================================
// VARIABLES GLOBALES
// ============================================================

let currentUser = null;
let currentRoles = [];
let currentPermissions = [];


// ============================================================
// ECHAPPEMENT HTML
// ============================================================

function esc(value) {

    return String(value ?? "")
        .replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char]));

}


// ============================================================
// CHARGER LE PROFIL ET LES ROLES
// ============================================================

async function loadCurrentUser() {

    const {
        data: profile,
        error: profileError
    } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();


    if (profileError || !profile) {

        console.error(
            "Impossible de charger le profil :",
            profileError
        );

        sessionStorage.removeItem("msa_user");

        window.location.href = "login.html";

        return;

    }


    currentUser = profile;


    const {
        data: roleRows,
        error: roleError
    } = await supabase
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


    if (roleError) {

        console.error(
            "Erreur chargement rôles :",
            roleError
        );

        currentRoles = [];

    } else {

        currentRoles = (roleRows || [])
            .map(row => row.roles)
            .filter(Boolean);

    }


    await loadCurrentPermissions();

    renderUserIdentity();

    applyNavigationPermissions();

}


// ============================================================
// CHARGER LES PERMISSIONS
// ============================================================

async function loadCurrentPermissions() {

    currentPermissions = [];


    if (isAdmin()) {

        currentPermissions = [
            "view",
            "add",
            "edit",
            "edit_own",
            "delete",
            "delete_own"
        ];

        return;

    }


    if (!currentRoles.length) {
        return;
    }


    const roleIds = currentRoles.map(
        role => role.id
    );


    const {
        data,
        error
    } = await supabase
        .from("role_permissions")
        .select(`
            module,
            permission_id,
            permissions (
                name
            )
        `)
        .in("role_id", roleIds);


    if (error) {

        console.error(
            "Erreur chargement permissions :",
            error
        );

        return;

    }


    currentPermissions = (data || [])
        .map(row => ({
            module: row.module,
            permission: row.permissions?.name
        }));

}


// ============================================================
// VERIFIER SI ADMIN
// ============================================================

function isAdmin() {

    return currentRoles.some(
        role => role.is_admin === true
    );

}


// ============================================================
// VERIFIER UNE PERMISSION
// ============================================================

function hasPermission(
    permission,
    module
) {

    if (isAdmin()) {
        return true;
    }


    return currentPermissions.some(
        item =>
            item.permission === permission &&
            (
                item.module === module ||
                item.module === "*"
            )
    );

}


// ============================================================
// IDENTITE UTILISATEUR
// ============================================================

function renderUserIdentity() {

    if (!userMini) {
        return;
    }


    const roleBadges = currentRoles
        .map(role => {

            if (role.is_admin) {

                return `
                    <span class="role-badge admin-role">
                        👑 Admin
                    </span>
                `;

            }


            return `
                <span class="role-badge">
                    ${esc(role.icon || "")}
                    ${esc(role.name)}
                </span>
            `;

        })
        .join("");


    userMini.innerHTML = `

        <div class="user-mini">

            <strong>
                ${esc(
                    currentUser.display_name
                )}
            </strong>

            <div class="user-roles">

                ${
                    roleBadges ||
                    `<span class="muted">
                        Aucun rôle
                    </span>`
                }

            </div>

        </div>

    `;


    if (welcome) {

        welcome.textContent =
            `Bienvenue, ${currentUser.display_name}`;

    }

}


// ============================================================
// NAVIGATION SELON LES DROITS
// ============================================================

function applyNavigationPermissions() {

    const adminItems =
        document.querySelectorAll(
            ".admin-only"
        );


    if (isAdmin()) {

        adminItems.forEach(
            item => {
                item.style.display = "";
            }
        );

        return;

    }


    adminItems.forEach(
        item => {
            item.style.display = "none";
        }
    );

}


// ============================================================
// DECONNEXION
// ============================================================

const logoutBtn =
    document.querySelector(
        "#logoutBtn"
    );


if (logoutBtn) {

    logoutBtn.onclick = async () => {

        sessionStorage.removeItem(
            "msa_user"
        );

        try {

            await supabase.auth.signOut();

        } catch (error) {

            console.error(error);

        }

        window.location.href =
            "login.html";

    };

}


// ============================================================
// MENU MOBILE
// ============================================================

const mobileMenu =
    document.querySelector(
        "#mobileMenu"
    );


if (mobileMenu) {

    mobileMenu.onclick = () => {

        document
            .querySelector(".sidebar")
            ?.classList.toggle("open");

    };

}


// ============================================================
// NAVIGATION
// ============================================================

document
    .querySelectorAll(".nav-item")
    .forEach(item => {

        item.onclick = () => {

            document
                .querySelectorAll(".nav-item")
                .forEach(
                    element =>
                        element.classList.remove(
                            "active"
                        )
                );


            item.classList.add(
                "active"
            );


            load(
                item.dataset.page
            );


            document
                .querySelector(".sidebar")
                ?.classList.remove(
                    "open"
                );

        };

    });


// ============================================================
// CHARGEMENT DES PAGES
// ============================================================

async function load(page) {

    const pageElement =
        document.querySelector(
            `[data-page="${page}"]`
        );


    title.textContent =
        pageElement
            ?.querySelector("span")
            ?.textContent ||
        "Tableau de bord";


    if (page === "dashboard") {

        return dashboard();

    }


    if (page === "users") {

        return users();

    }


    if (page === "requests") {

        return requests();

    }


    if (page === "roles") {

        return roles();

    }


    if (page === "permissions") {

        return permissions();

    }


    return generic(page);

}


// ============================================================
// DASHBOARD
// ============================================================

async function dashboard() {

    const [
        marriages,
        sanctions,
        blacklist,
        documents
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
                    ${marriages.count ?? 0}
                </strong>
            </div>

            <div class="stat-card">
                <small>Sanctions</small>
                <strong>
                    ${sanctions.count ?? 0}
                </strong>
            </div>

            <div class="stat-card">
                <small>Blacklist actives</small>
                <strong>
                    ${blacklist.count ?? 0}
                </strong>
            </div>

            <div class="stat-card">
                <small>Documents</small>
                <strong>
                    ${documents.count ?? 0}
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

                : "Aucune activité.";

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
            "event_date"
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

                : "Aucun événement.";

    }

}


// ============================================================
// PAGES DE DONNEES
// ============================================================

async function generic(page) {

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
        .select(`
            *,
            creator:created_by (
                display_name
            )
        `)
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

                    Erreur :
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
                Données partagées de la Mairie.
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


            ${
                hasPermission(
                    "add",
                    table
                )

                    ? `
                        <button
                            class="primary-btn"
                            id="add"
                        >
                            + Ajouter
                        </button>
                    `

                    : ""
            }

        </div>


        <div class="panel table-wrap">

            <table class="table">

                <thead>

                    <tr>

                        <th>
                            Informations
                        </th>

                        <th>
                            Ajouté par
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


    const addButton =
        document.querySelector(
            "#add"
        );


    if (addButton) {

        addButton.onclick =
            () =>
                openAdd(
                    table,
                    label
                );

    }


    const search =
        document.querySelector(
            "#search"
        );


    if (search) {

        search.oninput =
            event => {

                const value =
                    event.target.value
                        .toLowerCase();


                renderRows(

                    (data || [])
                        .filter(item =>
                            JSON.stringify(
                                item
                            )
                            .toLowerCase()
                            .includes(
                                value
                            )
                        ),

                    table

                );

            };

    }

}


// ============================================================
// AFFICHER LES LIGNES
// ============================================================

function renderRows(
    rows,
    table
) {

    const rowsElement =
        document.querySelector(
            "#rows"
        );


    if (!rowsElement) {
        return;
    }


    if (!rows.length) {

        rowsElement.innerHTML = `

            <tr>

                <td colspan="4">

                    <div class="empty">

                        Aucune donnée.

                    </div>

                </td>

            </tr>

        `;

        return;

    }


    rowsElement.innerHTML =
        rows
            .map(item => {

                const own =
                    item.created_by ===
                    user.id;


                const canEdit =
                    isAdmin() ||
                    hasPermission(
                        "edit",
                        table
                    ) ||
                    (
                        own &&
                        hasPermission(
                            "edit_own",
                            table
                        )
                    );


                const canDelete =
                    isAdmin() ||
                    hasPermission(
                        "delete",
                        table
                    ) ||
                    (
                        own &&
                        hasPermission(
                            "delete_own",
                            table
                        )
                    );


                return `

                    <tr>

                        <td>

                            <strong>
                                ${esc(
                                    item.title
                                )}
                            </strong>

                            <br>

                            <span class="muted">

                                ${esc(
                                    item.details ||
                                    "Aucun détail"
                                )}

                            </span>

                        </td>


                        <td>

                            ${
                                esc(
                                    item.creator
                                        ?.display_name ||
                                    "Utilisateur inconnu"
                                )
                            }

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

                                ${
                                    canEdit

                                        ? `

                                            <button
                                                class="secondary-btn"
                                                data-edit="${item.id}"
                                            >
                                                Modifier
                                            </button>

                                        `

                                        : ""
                                }


                                ${
                                    canDelete

                                        ? `

                                            <button
                                                class="danger-btn"
                                                data-delete="${item.id}"
                                            >
                                                Supprimer
                                            </button>

                                        `

                                        : ""
                                }


                                ${
                                    !canEdit &&
                                    !canDelete

                                        ? `
                                            <span class="muted">
                                                Lecture seule
                                            </span>
                                          `

                                        : ""
                                }

                            </div>

                        </td>

                    </tr>

                `;

            })
            .join("");


    document
        .querySelectorAll(
            "[data-delete]"
        )
        .forEach(button => {

            button.onclick =
                () =>
                    deleteItem(
                        table,
                        button.dataset.delete
                    );

        });


    document
        .querySelectorAll(
            "[data-edit]"
        )
        .forEach(button => {

            button.onclick =
                () =>
                    editItem(
                        table,
                        button.dataset.edit
                    );

        });

}


// ============================================================
// AJOUTER UN ELEMENT
// ============================================================

function openAdd(
    table,
    label
) {

    modalRoot.innerHTML = `

        <div class="modal-backdrop">

            <div class="modal">

                <div class="modal-head">

                    <h2>
                        Ajouter — ${esc(label)}
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

                        Titre / Nom

                        <input
                            id="addTitle"
                            required
                        >

                    </label>


                    <label>

                        Détails

                        <textarea
                            id="addDetails"
                            rows="5"
                        ></textarea>

                    </label>


                    ${
                        table === "agenda"

                            ? `

                                <label>

                                    Date de l'événement

                                    <input
                                        id="eventDate"
                                        type="datetime-local"
                                        required
                                    >

                                </label>

                            `

                            : ""
                    }


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


    modalRoot
        .querySelector(
            ".close"
        )
        .onclick =
            () =>
                modalRoot.innerHTML = "";


    modalRoot
        .querySelector(
            "#addForm"
        )
        .onsubmit =
            async event => {

                event.preventDefault();


                const payload = {

                    title:
                        document.querySelector(
                            "#addTitle"
                        ).value
                        .trim(),

                    details:
                        document.querySelector(
                            "#addDetails"
                        ).value
                        .trim(),

                    created_by:
                        user.id

                };


                if (
                    table ===
                    "agenda"
                ) {

                    payload.event_date =
                        new Date(
                            document.querySelector(
                                "#eventDate"
                            ).value
                        ).toISOString();

                }


                const {
                    error
                } = await supabase
                    .from(table)
                    .insert(
                        payload
                    );


                if (error) {

                    alert(
                        error.message
                    );

                    return;

                }


                modalRoot.innerHTML =
                    "";


                generic(
                    Object.keys({
                        mariages: 1,
                        name_changes: 1,
                        sanctions: 1,
                        blacklist: 1,
                        agenda: 1,
                        documents: 1
                    })
                    .find(
                        key =>
                            key === table
                    ) || table
                );

            };

}


// ============================================================
// MODIFIER
// ============================================================

async function editItem(
    table,
    id
) {

    const {
        data: item,
        error
    } = await supabase
        .from(table)
        .select("*")
        .eq(
            "id",
            id
        )
        .single();


    if (error || !item) {

        alert(
            error?.message ||
            "Élément introuvable."
        );

        return;

    }


    modalRoot.innerHTML = `

        <div class="modal-backdrop">

            <div class="modal">

                <div class="modal-head">

                    <h2>
                        Modifier
                    </h2>

                    <button
                        class="close"
                        type="button"
                    >
                        ×
                    </button>

                </div>


                <form id="editForm">

                    <label>

                        Titre / Nom

                        <input
                            id="editTitle"
                            value="${esc(
                                item.title
                            )}"
                            required
                        >

                    </label>


                    <label>

                        Détails

                        <textarea
                            id="editDetails"
                            rows="5"
                        >${esc(
                            item.details ||
                            ""
                        )}</textarea>

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


    modalRoot
        .querySelector(
            ".close"
        )
        .onclick =
            () =>
                modalRoot.innerHTML = "";


    modalRoot
        .querySelector(
            "#editForm"
        )
        .onsubmit =
            async event => {

                event.preventDefault();


                const {
                    error
                } = await supabase
                    .from(table)
                    .update({

                        title:
                            document.querySelector(
                                "#editTitle"
                            ).value
                            .trim(),

                        details:
                            document.querySelector(
                                "#editDetails"
                            ).value
                            .trim(),

                        updated_by:
                            user.id,

                        updated_at:
                            new Date()
                                .toISOString()

                    })
                    .eq(
                        "id",
                        id
                    );


                if (error) {

                    alert(
                        error.message
                    );

                    return;

                }


                modalRoot.innerHTML =
                    "";


                location.reload();

            };

}


// ============================================================
// SUPPRIMER
// ============================================================

async function deleteItem(
    table,
    id
) {

    if (
        !confirm(
            "Voulez-vous vraiment supprimer cet élément ?"
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
            id
        );


    if (error) {

        alert(
            error.message
        );

        return;

    }


    load(
        document.querySelector(
            ".nav-item.active"
        )?.dataset.page ||
        "dashboard"
    );

}


// ============================================================
// DEMANDES DE COMPTES
// ============================================================

async function requests() {

    if (!isAdmin()) {

        content.innerHTML = `

            <div class="panel">

                <div class="empty">

                    Accès réservé aux administrateurs.

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
                Gérez les demandes d'accès à la Mairie.
            </p>

        </div>


        <div class="panel table-wrap">

            <table class="table">

                <thead>

                    <tr>

                        <th>
                            Identifiant
                        </th>

                        <th>
                            Nom
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
                                            request.username
                                        )}
                                    </td>

                                    <td>
                                        ${esc(
                                            request.first_name
                                        )}
                                        ${esc(
                                            request.last_name
                                        )}
                                    </td>

                                    <td>
                                        ${esc(
                                            request.reason ||
                                            "—"
                                        )}
                                    </td>

                                    <td>
                                        ${esc(
                                            request.status
                                        )}
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

            button.onclick =
                () =>
                    decideRequest(
                        button.dataset.approve,
                        "approved"
                    );

        });


    document
        .querySelectorAll(
            "[data-reject]"
        )
        .forEach(button => {

            button.onclick =
                () =>
                    decideRequest(
                        button.dataset.reject,
                        "rejected"
                    );

        });

}


// ============================================================
// TRAITER UNE DEMANDE
// ============================================================

async function decideRequest(
    id,
    status
) {

    const {
        error
    } = await supabase
        .from("account_requests")
        .update({

            status,

            reviewed_by:
                user.id,

            reviewed_at:
                new Date()
                    .toISOString()

        })
        .eq(
            "id",
            id
        );


    if (error) {

        alert(
            error.message
        );

        return;

    }


    requests();

}


// ============================================================
// GESTION DES COMPTES
// ============================================================

async function users() {

    if (!isAdmin()) {

        content.innerHTML = `

            <div class="panel">

                <div class="empty">
                    Accès réservé aux administrateurs.
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
                            Identifiant
                        </th>

                        <th>
                            Rôles
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
                            .map(profile => {

                                const roles =
                                    (profile.user_roles || [])
                                        .map(
                                            row =>
                                                row.roles
                                        )
                                        .filter(Boolean);


                                const roleHTML =
                                    roles
                                        .map(role => {

                                            if (
                                                role.is_admin
                                            ) {

                                                return `
                                                    <span class="role-badge admin-role">
                                                        👑 Admin
                                                    </span>
                                                `;

                                            }


                                            return `

                                                <span class="role-badge">

                                                    ${esc(
                                                        role.icon ||
                                                        ""
                                                    )}

                                                    ${esc(
                                                        role.name
                                                    )}

                                                </span>

                                            `;

                                        })
                                        .join("");


                                return `

                                    <tr>

                                        <td>

                                            <strong>
                                                ${esc(
                                                    profile.display_name
                                                )}
                                            </strong>

                                        </td>


                                        <td>

                                            ${esc(
                                                profile.username
                                            )}

                                        </td>


                                        <td>

                                            ${
                                                roleHTML ||
                                                "Aucun rôle"
                                            }

                                        </td>


                                        <td>

                                            ${
                                                profile.active
                                                    ? "Actif"
                                                    : "Désactivé"
                                            }

                                        </td>


                                        <td>

                                            <button
                                                class="secondary-btn"
                                                data-manage-user="${profile.id}"
                                            >
                                                Gérer
                                            </button>

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


    document
        .querySelectorAll(
            "[data-manage-user]"
        )
        .forEach(button => {

            button.onclick =
                () =>
                    manageUser(
                        button.dataset.manageUser
                    );

        });

}


// ============================================================
// GERER UN UTILISATEUR
// ============================================================

async function manageUser(
    userId
) {

    const {
        data: profile
    } = await supabase
        .from("profiles")
        .select("*")
        .eq(
            "id",
            userId
        )
        .single();


    const {
        data: roles
    } = await supabase
        .from("roles")
        .select("*")
        .order(
            "name"
        );


    const {
        data: assigned
    } = await supabase
        .from("user_roles")
        .select("role_id")
        .eq(
            "user_id",
            userId
        );


    const assignedIds =
        (assigned || [])
            .map(
                item =>
                    item.role_id
            );


    modalRoot.innerHTML = `

        <div class="modal-backdrop">

            <div class="modal">

                <div class="modal-head">

                    <h2>
                        Gérer les rôles
                    </h2>

                    <button
                        class="close"
                        type="button"
                    >
                        ×
                    </button>

                </div>


                <p>

                    <strong>
                        ${esc(
                            profile.display_name
                        )}
                    </strong>

                </p>


                <form id="rolesForm">

                    ${
                        (roles || [])
                            .map(role => `

                                <label>

                                    <input
                                        type="checkbox"
                                        value="${role.id}"
                                        ${
                                            assignedIds.includes(
                                                role.id
                                            )
                                                ? "checked"
                                                : ""
                                        }
                                    >

                                    ${esc(
                                        role.icon ||
                                        ""
                                    )}

                                    ${esc(
                                        role.name
                                    )}

                                </label>

                            `)
                            .join("")
                    }


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


    modalRoot
        .querySelector(
            ".close"
        )
        .onclick =
            () =>
                modalRoot.innerHTML = "";


    modalRoot
        .querySelector(
            "#rolesForm"
        )
        .onsubmit =
            async event => {

                event.preventDefault();


                const selected =
                    Array.from(
                        modalRoot
                            .querySelectorAll(
                                "input[type=checkbox]:checked"
                            )
                    )
                    .map(
                        input =>
                            input.value
                    );


                await supabase
                    .from("user_roles")
                    .delete()
                    .eq(
                        "user_id",
                        userId
                    );


                if (selected.length) {

                    await supabase
                        .from("user_roles")
                        .insert(

                            selected.map(
                                roleId => ({
                                    user_id:
                                        userId,

                                    role_id:
                                        roleId
                                })
                            )

                        );

                }


                modalRoot.innerHTML =
                    "";


                users();

            };

}


// ============================================================
// GESTION DES ROLES
// ============================================================

async function roles() {

    if (!isAdmin()) {

        content.innerHTML = `

            <div class="panel">

                <div class="empty">
                    Accès réservé aux administrateurs.
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

        alert(
            error.message
        );

        return;

    }


    content.innerHTML = `

        <div class="page-intro">

            <h2>
                Rôles
            </h2>

            <p class="muted">
                Créez et gérez les rôles de la Mairie.
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
                            Rôle
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


    document
        .querySelector(
            "#createRole"
        )
        .onclick =
            () =>
                openRoleForm();


    document
        .querySelectorAll(
            "[data-edit-role]"
        )
        .forEach(button => {

            button.onclick =
                () =>
                    openRoleForm(
                        button.dataset.editRole
                    );

        });


    document
        .querySelectorAll(
            "[data-delete-role]"
        )
        .forEach(button => {

            button.onclick =
                () =>
                    deleteRole(
                        button.dataset.deleteRole
                    );

        });

}


// ============================================================
// FORMULAIRE ROLE
// ============================================================

async function openRoleForm(
    roleId = null
) {

    let role = null;


    if (roleId) {

        const result =
            await supabase
                .from("roles")
                .select("*")
                .eq(
                    "id",
                    roleId
                )
                .single();


        role =
            result.data;

    }


    modalRoot.innerHTML = `

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
                        👑

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


    modalRoot
        .querySelector(
            ".close"
        )
        .onclick =
            () =>
                modalRoot.innerHTML = "";


    modalRoot
        .querySelector(
            "#roleForm"
        )
        .onsubmit =
            async event => {

                event.preventDefault();


                const payload = {

                    name:
                        document.querySelector(
                            "#roleName"
                        ).value
                        .trim(),

                    description:
                        document.querySelector(
                            "#roleDescription"
                        ).value
                        .trim(),

                    icon:
                        document.querySelector(
                            "#roleIcon"
                        ).value
                        .trim(),

                    is_admin:
                        document.querySelector(
                            "#roleAdmin"
                        ).checked

                };


                const result =
                    roleId

                        ? await supabase
                            .from("roles")
                            .update(
                                payload
                            )
                            .eq(
                                "id",
                                roleId
                            )

                        : await supabase
                            .from("roles")
                            .insert(
                                payload
                            );


                if (result.error) {

                    alert(
                        result.error.message
                    );

                    return;

                }


                modalRoot.innerHTML =
                    "";


                roles();

            };

}


// ============================================================
// SUPPRIMER UN ROLE
// ============================================================

async function deleteRole(
    roleId
) {

    if (
        !confirm(
            "Supprimer définitivement ce rôle ?"
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
            roleId
        );


    if (error) {

        alert(
            error.message
        );

        return;

    }


    roles();

}


// ============================================================
// PERMISSIONS
// ============================================================

async function permissions() {

    if (!isAdmin()) {

        content.innerHTML = `

            <div class="panel">

                <div class="empty">
                    Accès réservé aux administrateurs.
                </div>

            </div>

        `;

        return;

    }


    const {
        data: rolesList
    } = await supabase
        .from("roles")
        .select("*")
        .order(
            "name"
        );


    const {
        data: permissionsList
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
                Attribuez les permissions aux rôles.
            </p>

        </div>


        <div class="panel">

            <label>

                Rôle

                <select id="permissionRole">

                    <option value="">
                        Sélectionner un rôle
                    </option>

                    ${
                        (rolesList || [])
                            .map(role => `

                                <option
                                    value="${role.id}"
                                >

                                    ${
                                        role.is_admin
                                            ? "👑 "
                                            : ""
                                    }

                                    ${esc(
                                        role.name
                                    )}

                                </option>

                            `)
                            .join("")
                    }

                </select>

            </label>


            <div id="permissionEditor">

                <div class="empty">

                    Sélectionnez un rôle.

                </div>

            </div>

        </div>

    `;


    document
        .querySelector(
            "#permissionRole"
        )
        .onchange =
            event => {

                if (
                    !event.target.value
                ) {

                    return;

                }


                renderPermissionEditor(

                    event.target.value,

                    permissionsList || []

                );

            };

}


// ============================================================
// EDITEUR PERMISSIONS
// ============================================================

async function renderPermissionEditor(
    roleId,
    permissionsList
) {

    const {
        data: assigned
    } = await supabase
        .from("role_permissions")
        .select(`
            permission_id,
            module
        `)
        .eq(
            "role_id",
            roleId
        );


    const modules = [

        "mariages",
        "name_changes",
        "sanctions",
        "blacklist",
        "agenda",
        "documents"

    ];


    const editor =
        document.querySelector(
            "#permissionEditor"
        );


    editor.innerHTML = `

        <form id="permissionForm">

            ${

                modules
                    .map(module => `

                        <div class="panel">

                            <h3>
                                ${esc(
                                    module
                                )}
                            </h3>


                            ${
                                permissionsList
                                    .map(permission => {

                                        const checked =
                                            (assigned || [])
                                                .some(
                                                    item =>
                                                        item.permission_id ===
                                                        permission.id &&
                                                        item.module ===
                                                        module
                                                );


                                        return `

                                            <label>

                                                <input
                                                    type="checkbox"
                                                    data-permission="${permission.id}"
                                                    data-module="${module}"
                                                    ${
                                                        checked
                                                            ? "checked"
                                                            : ""
                                                    }
                                                >

                                                ${esc(
                                                    permission.name
                                                )}

                                            </label>

                                        `;

                                    })
                                    .join("")
                            }

                        </div>

                    `)
                    .join("")

            }


            <button
                class="primary-btn"
                type="submit"
            >
                Enregistrer les permissions
            </button>

        </form>

    `;


    document
        .querySelector(
            "#permissionForm"
        )
        .onsubmit =
            async event => {

                event.preventDefault();


                await supabase
                    .from("role_permissions")
                    .delete()
                    .eq(
                        "role_id",
                        roleId
                    );


                const selected =
                    Array.from(
                        document
                            .querySelectorAll(
                                "#permissionForm input[type=checkbox]:checked"
                            )
                    );


                if (selected.length) {

                    const rows =
                        selected.map(
                            input => ({

                                role_id:
                                    roleId,

                                permission_id:
                                    input.dataset.permission,

                                module:
                                    input.dataset.module

                            })
                        );


                    const {
                        error
                    } = await supabase
                        .from("role_permissions")
                        .insert(
                            rows
                        );


                    if (error) {

                        alert(
                            error.message
                        );

                        return;

                    }

                }


                alert(
                    "Permissions enregistrées."
                );

            };

}


// ============================================================
// DEMARRAGE
// ============================================================

async function startApp() {

    await loadCurrentUser();

    await load(
        "dashboard"
    );

}


startApp();
```
