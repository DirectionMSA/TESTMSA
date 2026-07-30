import { supabase } from "./supabase.js";

/* ============================================================
   UTILISATEUR CONNECTÉ
============================================================ */

const user = JSON.parse(
    sessionStorage.getItem("msa_user") || "null"
);

if (!user) {
    window.location.href = "login.html";
    throw new Error("Utilisateur non connecté.");
}


/* ============================================================
   ELEMENTS
============================================================ */

const content = document.querySelector("#content");
const title = document.querySelector("#pageTitle");
const welcome = document.querySelector("#welcomeText");
const userMini = document.querySelector("#userMini");
const logoutBtn = document.querySelector("#logoutBtn");
const mobileMenu = document.querySelector("#mobileMenu");
const modalRoot = document.querySelector("#modalRoot");


/* ============================================================
   UTILITAIRE SECURITE HTML
============================================================ */

function esc(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* ============================================================
   AFFICHAGE DES ROLES
============================================================ */

function renderUserRoles() {

    const roles = Array.isArray(user.roles)
        ? user.roles
        : [];

    let html = `
        <div class="user-mini">
            <strong>
                ${esc(user.display_name)}
            </strong>
    `;


    /*
    ADMIN = COURONNE UNIQUE
    */

    if (user.is_admin) {

        html += `
            <div class="user-role admin-role">
                👑 Admin
            </div>
        `;

    }


    /*
    AUTRES ROLES
    */

    roles.forEach(role => {

        if (!role || role.is_admin) {
            return;
        }

        html += `
            <div class="user-role">
                ${esc(role.icon || "•")}
                ${esc(role.name)}
            </div>
        `;

    });


    if (
        !user.is_admin &&
        roles.length === 0
    ) {

        html += `
            <div class="user-role">
                Utilisateur
            </div>
        `;

    }


    html += `
        </div>
    `;

    return html;

}


if (userMini) {

    userMini.innerHTML =
        renderUserRoles();

}


if (welcome) {

    welcome.textContent =
        `Bienvenue, ${user.display_name}`;

}


/* ============================================================
   ADMINISTRATION
============================================================ */

if (!user.is_admin) {

    document
        .querySelectorAll(".admin-only")
        .forEach(element => {

            element.style.display = "none";

        });

}


/* ============================================================
   DECONNEXION
============================================================ */

if (logoutBtn) {

    logoutBtn.onclick = async () => {

        await supabase.auth.signOut();

        sessionStorage.removeItem(
            "msa_user"
        );

        window.location.href =
            "login.html";

    };

}


/* ============================================================
   MENU MOBILE
============================================================ */

if (mobileMenu) {

    mobileMenu.onclick = () => {

        document
            .querySelector(".sidebar")
            ?.classList.toggle("open");

    };

}


/* ============================================================
   NAVIGATION
============================================================ */

document
    .querySelectorAll(".nav-item")
    .forEach(item => {

        item.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(".nav-item")
                    .forEach(element => {

                        element.classList.remove(
                            "active"
                        );

                    });


                item.classList.add(
                    "active"
                );


                const page =
                    item.dataset.page;

                loadPage(page);


                document
                    .querySelector(".sidebar")
                    ?.classList.remove(
                        "open"
                    );

            }
        );

    });


/* ============================================================
   TITRES
============================================================ */

const pageTitles = {

    dashboard:
        "Tableau de bord",

    mariages:
        "Mariages",

    noms:
        "Changements de nom",

    sanctions:
        "Sanctions",

    blacklist:
        "Blacklist",

    agenda:
        "Agenda",

    documents:
        "Documents",

    users:
        "Comptes",

    requests:
        "Demandes de comptes",

    roles:
        "Rôles",

    permissions:
        "Permissions"

};


/* ============================================================
   CHARGEMENT PAGE
============================================================ */

async function loadPage(page) {

    title.textContent =
        pageTitles[page] ||
        "Tableau de bord";


    if (page === "dashboard") {

        return dashboard();

    }


    if (page === "users") {

        return usersPage();

    }


    if (page === "requests") {

        return requestsPage();

    }


    if (page === "roles") {

        return rolesPage();

    }


    if (page === "permissions") {

        return permissionsPage();

    }


    return modulePage(page);

}


/* ============================================================
   DASHBOARD
============================================================ */

async function dashboard() {

    content.innerHTML = `

        <div class="cards">

            <div class="stat-card">
                <small>Mariages</small>
                <strong id="statMariages">—</strong>
            </div>

            <div class="stat-card">
                <small>Sanctions</small>
                <strong id="statSanctions">—</strong>
            </div>

            <div class="stat-card">
                <small>Blacklist actives</small>
                <strong id="statBlacklist">—</strong>
            </div>

            <div class="stat-card">
                <small>Documents</small>
                <strong id="statDocuments">—</strong>
            </div>

        </div>


        <div class="dashboard-grid">

            <div class="panel">

                <h2>
                    Activité récente
                </h2>

                <div
                    id="recentActivity"
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
                    id="upcomingEvents"
                    class="empty"
                >
                    Chargement…
                </div>

            </div>

        </div>

    `;


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


    document.querySelector(
        "#statMariages"
    ).textContent =
        marriages.count ?? 0;


    document.querySelector(
        "#statSanctions"
    ).textContent =
        sanctions.count ?? 0;


    document.querySelector(
        "#statBlacklist"
    ).textContent =
        blacklist.count ?? 0;


    document.querySelector(
        "#statDocuments"
    ).textContent =
        documents.count ?? 0;


    const {
        data: activity
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
            "#recentActivity"
        );


    if (
        activity &&
        activity.length
    ) {

        recent.innerHTML =
            activity
                .map(item => `

                    <div class="event">

                        <b>
                            ${esc(item.action)}
                        </b>

                        <small>
                            ${new Date(
                                item.created_at
                            ).toLocaleString(
                                "fr-FR"
                            )}
                        </small>

                    </div>

                `)
                .join("");

    } else {

        recent.textContent =
            "Aucune activité récente.";

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


    const upcoming =
        document.querySelector(
            "#upcomingEvents"
        );


    if (
        events &&
        events.length
    ) {

        upcoming.innerHTML =
            events
                .map(event => `

                    <div class="event">

                        <b>
                            ${esc(event.title)}
                        </b>

                        <small>
                            ${new Date(
                                event.event_date
                            ).toLocaleString(
                                "fr-FR"
                            )}
                        </small>

                    </div>

                `)
                .join("");

    } else {

        upcoming.textContent =
            "Aucun événement à venir.";

    }

}


/* ============================================================
   MODULES
============================================================ */

const moduleMap = {

    mariages: {
        table: "mariages",
        label: "Mariages"
    },

    noms: {
        table: "name_changes",
        label: "Changements de nom"
    },

    sanctions: {
        table: "sanctions",
        label: "Sanctions"
    },

    blacklist: {
        table: "blacklist",
        label: "Blacklist"
    },

    agenda: {
        table: "agenda",
        label: "Agenda"
    },

    documents: {
        table: "documents",
        label: "Documents"
    }

};


/* ============================================================
   PAGE MODULE
============================================================ */

async function modulePage(page) {

    const module =
        moduleMap[page];


    if (!module) {

        content.innerHTML = `

            <div class="panel">

                <h2>
                    Page introuvable
                </h2>

            </div>

        `;

        return;

    }


    const {
        data,
        error
    } = await supabase
        .from(module.table)
        .select(`
            *,
            creator:created_by (
                display_name
            ),
            updater:updated_by (
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

        console.error(error);

        content.innerHTML = `

            <div class="panel">

                <h2>
                    Erreur
                </h2>

                <p>
                    ${esc(error.message)}
                </p>

            </div>

        `;

        return;

    }


    content.innerHTML = `

        <div class="page-intro">

            <h2>
                ${module.label}
            </h2>

            <p class="muted">
                Données partagées de la Mairie de San Andreas.
            </p>

        </div>


        <div class="toolbar">

            <input
                class="search"
                id="moduleSearch"
                placeholder="Rechercher…"
            >


            <button
                class="primary-btn"
                id="addModule"
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
                            Ajouté par
                        </th>

                        <th>
                            Date
                        </th>

                        <th>
                            Actions
                        </th>

                    </tr>

                </thead>


                <tbody
                    id="moduleRows"
                ></tbody>

            </table>

        </div>

    `;


    renderModuleRows(
        data || [],
        module
    );


    document.querySelector(
        "#addModule"
    ).onclick = () => {

        openAddModal(
            module
        );

    };


    document.querySelector(
        "#moduleSearch"
    ).oninput = event => {

        const search =
            event.target.value
                .toLowerCase();


        const filtered =
            (data || [])
                .filter(item =>

                    JSON.stringify(item)
                        .toLowerCase()
                        .includes(search)

                );


        renderModuleRows(
            filtered,
            module
        );

    };

}


/* ============================================================
   RENDU DES LIGNES
============================================================ */

function renderModuleRows(
    rows,
    module
) {

    const tbody =
        document.querySelector(
            "#moduleRows"
        );


    if (!tbody) {
        return;
    }


    if (!rows.length) {

        tbody.innerHTML = `

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


    tbody.innerHTML =
        rows
            .map(item => {

                const creator =
                    item.creator?.display_name ||
                    "Utilisateur inconnu";


                return `

                    <tr>

                        <td>

                            <strong>
                                ${esc(
                                    item.title
                                )}
                            </strong>

                            <br>

                            <small>
                                ${esc(
                                    item.details ||
                                    ""
                                )}
                            </small>

                        </td>


                        <td>

                            ${esc(
                                creator
                            )}

                        </td>


                        <td>

                            ${item.created_at
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
                                    data-edit-id="${item.id}"
                                >
                                    Modifier
                                </button>


                                <button
                                    class="danger-btn"
                                    data-delete-id="${item.id}"
                                >
                                    Supprimer
                                </button>

                            </div>

                        </td>

                    </tr>

                `;

            })
            .join("");


    document
        .querySelectorAll(
            "[data-delete-id]"
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
                    .from(module.table)
                    .delete()
                    .eq(
                        "id",
                        button.dataset.deleteId
                    );


                if (error) {

                    alert(
                        error.message
                    );

                    return;

                }


                modulePage(
                    Object.keys(
                        moduleMap
                    ).find(
                        key =>
                            moduleMap[key]
                                .table === module.table
                    )
                );

            };

        });

}


/* ============================================================
   AJOUT
============================================================ */

function openAddModal(
    module
) {

    modalRoot.innerHTML = `

        <div class="modal-backdrop">

            <div class="modal">

                <div class="modal-head">

                    <h2>
                        Ajouter — ${module.label}
                    </h2>

                    <button
                        class="close"
                        type="button"
                    >
                        ×
                    </button>

                </div>


                <form
                    id="addModuleForm"
                >

                    <label>

                        Titre / Nom

                        <input
                            id="moduleTitle"
                            required
                        >

                    </label>


                    <label>

                        Détails

                        <textarea
                            id="moduleDetails"
                            rows="5"
                        ></textarea>

                    </label>


                    ${
                        module.table === "agenda"
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
        .querySelector(".close")
        .onclick = () => {

            modalRoot.innerHTML =
                "";

        };


    document.querySelector(
        "#addModuleForm"
    ).onsubmit = async event => {

        event.preventDefault();


        const payload = {

            title:
                document.querySelector(
                    "#moduleTitle"
                ).value.trim(),

            details:
                document.querySelector(
                    "#moduleDetails"
                ).value.trim(),

            created_by:
                user.id

        };


        if (
            module.table === "agenda"
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
            .from(module.table)
            .insert(payload);


        if (error) {

            alert(
                error.message
            );

            return;

        }


        modalRoot.innerHTML =
            "";


        const page =
            Object.keys(
                moduleMap
            ).find(
                key =>
                    moduleMap[key]
                        .table === module.table
            );


        modulePage(page);

    };

}


/* ============================================================
   COMPTES
============================================================ */

async function usersPage() {

    if (!user.is_admin) {

        content.innerHTML = `

            <div class="panel">

                <h2>
                    Accès refusé
                </h2>

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

                ${esc(
                    error.message
                )}

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
                Gestion des comptes utilisateurs.
            </p>

        </div>


        <div class="toolbar">

            <button
                class="primary-btn"
                id="createAccount"
            >
                + Créer un compte
            </button>

        </div>


        <div class="panel table-wrap">

            <table class="table">

                <thead>

                    <tr>

                        <th>
                            Utilisateur
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
                                            relation =>
                                                relation.roles
                                        )
                                        .filter(Boolean);


                                const admin =
                                    roles.find(
                                        role =>
                                            role.is_admin
                                    );


                                const normalRoles =
                                    roles.filter(
                                        role =>
                                            !role.is_admin
                                    );


                                let roleHtml = "";


                                if (admin) {

                                    roleHtml +=
                                        "👑 Admin";

                                }


                                if (
                                    normalRoles.length
                                ) {

                                    if (
                                        roleHtml
                                    ) {

                                        roleHtml +=
                                            " • ";

                                    }


                                    roleHtml +=
                                        normalRoles
                                            .map(
                                                role =>
                                                    `${role.icon || ""} ${esc(role.name)}`
                                            )
                                            .join(
                                                " • "
                                            );

                                }


                                if (!roleHtml) {

                                    roleHtml =
                                        "Aucun rôle";

                                }


                                return `

                                    <tr>

                                        <td>

                                            <strong>
                                                ${esc(
                                                    profile.display_name
                                                )}
                                            </strong>

                                            <br>

                                            <small>
                                                ${esc(
                                                    profile.username
                                                )}
                                            </small>

                                        </td>


                                        <td>

                                            ${roleHtml}

                                        </td>


                                        <td>

                                            ${
                                                profile.active
                                                    ? "🟢 Actif"
                                                    : "🔴 Désactivé"
                                            }

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


    document.querySelector(
        "#createAccount"
    ).onclick = () => {

        alert(
            "La création de compte sera reliée au système Supabase Auth dans la prochaine étape."
        );

    };

}


/* ============================================================
   DEMANDES DE COMPTES
============================================================ */

async function requestsPage() {

    if (!user.is_admin) {

        content.innerHTML = `

            <div class="panel">

                <h2>
                    Accès refusé
                </h2>

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

                ${esc(
                    error.message
                )}

            </div>

        `;

        return;

    }


    content.innerHTML = `

        <div class="page-intro">

            <h2>
                Demandes de comptes
            </h2>

        </div>


        <div class="panel table-wrap">

            <table class="table">

                <thead>

                    <tr>

                        <th>
                            Demandeur
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

            button.onclick = () => {

                alert(
                    "L'approbation automatique sera reliée à l'Edge Function Supabase."
                );

            };

        });


    document
        .querySelectorAll(
            "[data-reject]"
        )
        .forEach(button => {

            button.onclick = async () => {

                const {
                    error
                } = await supabase
                    .from(
                        "account_requests"
                    )
                    .update({

                        status:
                            "rejected",

                        reviewed_by:
                            user.id,

                        reviewed_at:
                            new Date()
                                .toISOString()

                    })
                    .eq(
                        "id",
                        button.dataset.reject
                    );


                if (error) {

                    alert(
                        error.message
                    );

                    return;

                }


                requestsPage();

            };

        });

}


/* ============================================================
   ROLES
============================================================ */

async function rolesPage() {

    if (!user.is_admin) {

        content.innerHTML = `

            <div class="panel">

                <h2>
                    Accès refusé
                </h2>

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
            "created_at"
        );


    if (error) {

        content.innerHTML = `

            <div class="panel">

                ${esc(
                    error.message
                )}

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
                            Type
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
                                                ? "👑 Administrateur"
                                                : "Rôle standard"
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


    document.querySelector(
        "#createRole"
    ).onclick = () => {

        alert(
            "La création et l'édition des rôles seront ajoutées dans le gestionnaire Admin."
        );

    };

}


/* ============================================================
   PERMISSIONS
============================================================ */

async function permissionsPage() {

    if (!user.is_admin) {

        content.innerHTML = `

            <div class="panel">

                <h2>
                    Accès refusé
                </h2>

            </div>

        `;

        return;

    }


    const {
        data,
        error
    } = await supabase
        .from("permissions")
        .select("*")
        .order(
            "name"
        );


    if (error) {

        content.innerHTML = `

            <div class="panel">

                ${esc(
                    error.message
                )}

            </div>

        `;

        return;

    }


    content.innerHTML = `

        <div class="page-intro">

            <h2>
                Permissions
            </h2>

            <p class="muted">
                Gestion des permissions disponibles.
            </p>

        </div>


        <div class="panel">

            ${
                (data || [])
                    .map(permission => `

                        <div class="event">

                            <b>
                                ${esc(
                                    permission.name
                                )}
                            </b>

                            <small>
                                ${esc(
                                    permission.description ||
                                    ""
                                )}
                            </small>

                        </div>

                    `)
                    .join("")
            }

        </div>

    `;

}


/* ============================================================
   INITIALISATION
============================================================ */

loadPage(
    "dashboard"
);
