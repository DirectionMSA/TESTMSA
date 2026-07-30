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
   SECURITE HTML
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
   ROLES UTILISATEUR
============================================================ */

const userRoles = Array.isArray(user.roles)
    ? user.roles
    : [];

const isAdmin = Boolean(user.is_admin);


/* ============================================================
   AFFICHAGE UTILISATEUR
============================================================ */

function renderUser() {

    if (!userMini) {
        return;
    }

    let html = `
        <div class="user-mini">

            <strong>
                ${esc(user.display_name || user.username)}
            </strong>
    `;


    if (isAdmin) {

        html += `
            <div class="user-role admin-role">
                👑 Administrateur
            </div>
        `;

    }


    const normalRoles = userRoles.filter(
        role => role && !role.is_admin
    );


    normalRoles.forEach(role => {

        html += `
            <div class="user-role">
                ${esc(role.icon || "•")}
                ${esc(role.name)}
            </div>
        `;

    });


    if (!isAdmin && normalRoles.length === 0) {

        html += `
            <div class="user-role">
                Utilisateur
            </div>
        `;

    }


    html += `
        </div>
    `;


    userMini.innerHTML = html;

}


renderUser();


if (welcome) {

    welcome.textContent =
        `Bienvenue, ${user.display_name || user.username}`;

}


/* ============================================================
   ADMINISTRATION
============================================================ */

if (!isAdmin) {

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

    permissions:
        "Permissions"

};


/* ============================================================
   MODULES
============================================================ */

const moduleMap = {

    mariages: {

        table:
            "mariages",

        label:
            "Mariages"

    },


    noms: {

        table:
            "name_changes",

        label:
            "Changements de nom"

    },


    sanctions: {

        table:
            "sanctions",

        label:
            "Sanctions"

    },


    blacklist: {

        table:
            "blacklist",

        label:
            "Blacklist"

    },


    agenda: {

        table:
            "agenda",

        label:
            "Agenda"

    },


    documents: {

        table:
            "documents",

        label:
            "Documents"

    }

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


    const results =
        await Promise.all([

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
        results[0].count ?? 0;


    document.querySelector(
        "#statSanctions"
    ).textContent =
        results[1].count ?? 0;


    document.querySelector(
        "#statBlacklist"
    ).textContent =
        results[2].count ?? 0;


    document.querySelector(
        "#statDocuments"
    ).textContent =
        results[3].count ?? 0;


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
   VERIFICATION PERMISSION
============================================================ */

async function hasPermission(
    permission,
    module
) {

    if (isAdmin) {

        return true;

    }


    const {
        data,
        error
    } = await supabase.rpc(
        "has_permission",
        {
            p_permission:
                permission,

            p_module:
                module
        }
    );


    if (error) {

        console.error(
            "Erreur permission:",
            error
        );

        return false;

    }


    return Boolean(data);

}


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


    const canView =
        await hasPermission(
            "view",
            page
        );


    if (!canView) {

        content.innerHTML = `

            <div class="panel">

                <h2>
                    Accès refusé
                </h2>

                <p>
                    Vous n'avez pas la permission
                    de consulter cette section.
                </p>

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


    const canAdd =
        await hasPermission(
            "add",
            page
        );


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

            ${
                canAdd
                    ? `
                        <button
                            class="primary-btn"
                            id="addModule"
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


    await renderModuleRows(
        data || [],
        module,
        page
    );


    if (canAdd) {

        document.querySelector(
            "#addModule"
        ).onclick = () => {

            openAddModal(
                module,
                page
            );

        };

    }


    document.querySelector(
        "#moduleSearch"
    ).oninput = async event => {

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


        await renderModuleRows(
            filtered,
            module,
            page
        );

    };

}


/* ============================================================
   RENDU DES LIGNES
============================================================ */

async function renderModuleRows(
    rows,
    module,
    page
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


                const isOwner =
                    item.created_by ===
                    user.id;


                let actions = "";


                if (isAdmin) {

                    actions = `

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

                    `;

                } else {

                    actions = `

                        <button
                            class="secondary-btn"
                            data-edit-id="${item.id}"
                            style="display:none"
                        >
                            Modifier
                        </button>

                        <button
                            class="danger-btn"
                            data-delete-id="${item.id}"
                            style="display:none"
                        >
                            Supprimer
                        </button>

                    `;

                }


                return `

                    <tr>

                        <td>

                            <strong>
                                ${esc(item.title)}
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

                                ${actions}

                            </div>

                        </td>

                    </tr>

                `;

            })
            .join("");


    const editButtons =
        tbody.querySelectorAll(
            "[data-edit-id]"
        );


    for (
        const button of editButtons
    ) {

        const item =
            rows.find(
                row =>
                    row.id ===
                    button.dataset.editId
            );


        if (!item) {
            continue;
        }


        const canEdit =
            isAdmin ||
            await hasPermission(
                "edit",
                page
            ) ||
            (
                isOwnerOf(item) &&
                await hasPermission(
                    "edit_own",
                    page
                )
            );


        if (!canEdit) {

            button.style.display =
                "none";

            continue;

        }


        button.onclick = () => {

            openEditModal(
                module,
                page,
                item
            );

        };

    }


    const deleteButtons =
        tbody.querySelectorAll(
            "[data-delete-id]"
        );


    for (
        const button of deleteButtons
    ) {

        const item =
            rows.find(
                row =>
                    row.id ===
                    button.dataset.deleteId
            );


        if (!item) {
            continue;
        }


        const canDelete =
            isAdmin ||
            await hasPermission(
                "delete",
                page
            ) ||
            (
                isOwnerOf(item) &&
                await hasPermission(
                    "delete_own",
                    page
                )
            );


        if (!canDelete) {

            button.style.display =
                "none";

            continue;

        }


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


            await modulePage(
                page
            );

        };

    }

}


/* ============================================================
   PROPRIETAIRE
============================================================ */

function isOwnerOf(item) {

    return (
        item.created_by ===
        user.id
    );

}


/* ============================================================
   AJOUT
============================================================ */

function openAddModal(
    module,
    page
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
            module.table ===
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
            .from(module.table)
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


        await modulePage(
            page
        );

    };

}


/* ============================================================
   MODIFICATION
============================================================ */

function openEditModal(
    module,
    page,
    item
) {

    modalRoot.innerHTML = `

        <div class="modal-backdrop">

            <div class="modal">

                <div class="modal-head">

                    <h2>
                        Modifier — ${module.label}
                    </h2>

                    <button
                        class="close"
                        type="button"
                    >
                        ×
                    </button>

                </div>


                <form
                    id="editModuleForm"
                >

                    <label>

                        Titre / Nom

                        <input
                            id="editTitle"
                            value="${esc(item.title)}"
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


                    ${
                        module.table === "agenda"
                            ? `

                                <label>

                                    Date de l'événement

                                    <input
                                        id="editEventDate"
                                        type="datetime-local"
                                        value="${
                                            item.event_date
                                                ? new Date(
                                                    item.event_date
                                                )
                                                    .toISOString()
                                                    .slice(
                                                        0,
                                                        16
                                                    )
                                                : ""
                                        }"
                                    >

                                </label>

                            `
                            : ""
                    }


                    <button
                        class="primary-btn"
                        type="submit"
                    >
                        Enregistrer les modifications
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
        "#editModuleForm"
    ).onsubmit = async event => {

        event.preventDefault();


        const payload = {

            title:
                document.querySelector(
                    "#editTitle"
                ).value.trim(),

            details:
                document.querySelector(
                    "#editDetails"
                ).value.trim()

        };


        if (
            module.table ===
            "agenda"
        ) {

            const date =
                document.querySelector(
                    "#editEventDate"
                ).value;


            if (date) {

                payload.event_date =
                    new Date(
                        date
                    ).toISOString();

            }

        }


        const {
            error
        } = await supabase
            .from(module.table)
            .update(
                payload
            )
            .eq(
                "id",
                item.id
            );


        if (error) {

            alert(
                error.message
            );

            return;

        }


        modalRoot.innerHTML =
            "";


        await modulePage(
            page
        );

    };

}


/* ============================================================
   COMPTES
============================================================ */

async function usersPage() {

    if (!isAdmin) {

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
                                    (
                                        profile.user_roles ||
                                        []
                                    )
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


                                let roleHtml =
                                    "";


                                if (admin) {

                                    roleHtml += `
                                        👑 Administrateur
                                    `;

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
                                                    `${esc(role.icon || "•")} ${esc(role.name)}`
                                            )
                                            .join(
                                                " • "
                                            );

                                }


                                if (
                                    !roleHtml
                                ) {

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

}


/* ============================================================
   DEMANDES DE COMPTES
============================================================ */

async function requestsPage() {

    if (!isAdmin) {

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
            "[data-reject]"
        )
        .forEach(button => {

            button.onclick =
                async () => {

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
   PERMISSIONS
============================================================ */

async function permissionsPage() {

    if (!isAdmin) {

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
                Permissions disponibles dans le système.
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
