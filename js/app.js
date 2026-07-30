import { supabase } from "./supabase.js";


// ============================================================
// UTILITAIRES
// ============================================================

function esc(value) {

    return String(value ?? "")
        .replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);

}


// ============================================================
// ELEMENTS
// ============================================================

const content =
    document.querySelector("#content");

const title =
    document.querySelector("#pageTitle");

const welcome =
    document.querySelector("#welcomeText");

const userMini =
    document.querySelector("#userMini");


// ============================================================
// VERIFIER LA SESSION SUPABASE
// ============================================================

const {
    data: {
        user: authUser
    }
} = await supabase.auth.getUser();


if (!authUser) {

    window.location.href =
        "login.html";

    throw new Error(
        "Utilisateur non connecté."
    );

}


// ============================================================
// CHARGER LE PROFIL
// ============================================================

const {
    data: profile,
    error: profileError
} = await supabase
    .from("profiles")
    .select(`
        id,
        username,
        display_name,
        first_name,
        last_name,
        active
    `)
    .eq(
        "id",
        authUser.id
    )
    .single();


if (profileError || !profile) {

    console.error(
        "Erreur profil :",
        profileError
    );

    await supabase.auth.signOut();

    window.location.href =
        "login.html";

    throw new Error(
        "Profil introuvable."
    );

}


// ============================================================
// VERIFIER SI LE COMPTE EST ACTIF
// ============================================================

if (!profile.active) {

    await supabase.auth.signOut();

    alert(
        "Votre compte a été désactivé."
    );

    window.location.href =
        "login.html";

    throw new Error(
        "Compte désactivé."
    );

}


// ============================================================
// CHARGER LES ROLES
// ============================================================

const {
    data: userRoles,
    error: rolesError
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
    .eq(
        "user_id",
        authUser.id
    );


if (rolesError) {

    console.error(
        "Erreur chargement rôles :",
        rolesError
    );

}


// ============================================================
// PREPARER LES ROLES
// ============================================================

const roles =
    (userRoles || [])
        .map(item => item.roles)
        .filter(Boolean);


// ============================================================
// VERIFIER ADMIN
// ============================================================

const isAdmin =
    roles.some(
        role =>
            role.is_admin === true
    );


// ============================================================
// OBJET UTILISATEUR GLOBAL
// ============================================================

const user = {

    id:
        profile.id,

    username:
        profile.username,

    display_name:
        profile.display_name,

    first_name:
        profile.first_name,

    last_name:
        profile.last_name,

    active:
        profile.active,

    roles:
        roles,

    isAdmin:
        isAdmin

};


// ============================================================
// SAUVEGARDER LA SESSION
// ============================================================

sessionStorage.setItem(
    "msa_user",
    JSON.stringify(user)
);


// ============================================================
// INTERFACE UTILISATEUR
// ============================================================

if (userMini) {

    const roleText =
        roles.length

            ? roles
                .map(role =>
                    `${role.icon || ""} ${role.name}`
                )
                .join(" • ")

            : "Aucun rôle";


    userMini.innerHTML = `

        <div class="user-mini">

            <strong>
                ${esc(user.display_name)}
            </strong>

            <span>
                ${user.isAdmin ? "👑 Admin • " : ""}
                ${esc(roleText)}
            </span>

        </div>

    `;

}


if (welcome) {

    welcome.textContent =
        `Bienvenue, ${user.display_name}`;

}


// ============================================================
// MENUS ADMIN
// ============================================================

const adminItems =
    document.querySelectorAll(
        ".admin-only"
    );


if (!user.isAdmin) {

    adminItems.forEach(
        element => {

            element.style.display =
                "none";

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

    logoutBtn.onclick =
        async () => {

            await supabase.auth.signOut();

            sessionStorage.removeItem(
                "msa_user"
            );

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

    mobileMenu.onclick =
        () => {

            document
                .querySelector(
                    ".sidebar"
                )
                ?.classList
                .toggle("open");

        };

}


// ============================================================
// NAVIGATION
// ============================================================

document
    .querySelectorAll(
        ".nav-item"
    )
    .forEach(
        item => {

            item.onclick =
                () => {

                    document
                        .querySelectorAll(
                            ".nav-item"
                        )
                        .forEach(
                            element =>
                                element.classList
                                    .remove(
                                        "active"
                                    )
                        );


                    item.classList.add(
                        "active"
                    );


                    const page =
                        item.dataset.page;


                    loadPage(
                        page
                    );


                    document
                        .querySelector(
                            ".sidebar"
                        )
                        ?.classList
                        .remove(
                            "open"
                        );

                };

        }
    );


// ============================================================
// CHARGER UNE PAGE
// ============================================================

async function loadPage(page) {

    const navItem =
        document.querySelector(
            `[data-page="${page}"]`
        );


    title.textContent =
        navItem
            ?.querySelector("span")
            ?.textContent
        || "Tableau de bord";


    if (page === "dashboard") {

        return dashboard();

    }


    if (page === "users") {

        if (!user.isAdmin) {

            return accessDenied();

        }

        return users();

    }


    if (page === "permissions") {

        if (!user.isAdmin) {

            return accessDenied();

        }

        return permissions();

    }


    if (page === "requests") {

        if (!user.isAdmin) {

            return accessDenied();

        }

        return requests();

    }


    return generic(
        page
    );

}


// ============================================================
// ACCES REFUSE
// ============================================================

function accessDenied() {

    content.innerHTML = `

        <div class="panel">

            <div class="empty">

                👑 Accès réservé aux administrateurs.

            </div>

        </div>

    `;

}


// ============================================================
// DASHBOARD
// ============================================================

async function dashboard() {

    content.innerHTML = `

        <div class="cards">

            <div class="stat-card">

                <small>Mariages</small>

                <strong id="countMariages">
                    —
                </strong>

            </div>


            <div class="stat-card">

                <small>Sanctions</small>

                <strong id="countSanctions">
                    —
                </strong>

            </div>


            <div class="stat-card">

                <small>Blacklist actives</small>

                <strong id="countBlacklist">
                    —
                </strong>

            </div>


            <div class="stat-card">

                <small>Documents</small>

                <strong id="countDocuments">
                    —
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


    const results =
        await Promise.all([

            supabase
                .from("mariages")
                .select(
                    "*",
                    {
                        count: "exact",
                        head: true
                    }
                ),

            supabase
                .from("sanctions")
                .select(
                    "*",
                    {
                        count: "exact",
                        head: true
                    }
                ),

            supabase
                .from("blacklist")
                .select(
                    "*",
                    {
                        count: "exact",
                        head: true
                    }
                )
                .eq(
                    "active",
                    true
                ),

            supabase
                .from("documents")
                .select(
                    "*",
                    {
                        count: "exact",
                        head: true
                    }
                )

        ]);


    document.querySelector(
        "#countMariages"
    ).textContent =
        results[0].count ?? 0;


    document.querySelector(
        "#countSanctions"
    ).textContent =
        results[1].count ?? 0;


    document.querySelector(
        "#countBlacklist"
    ).textContent =
        results[2].count ?? 0;


    document.querySelector(
        "#countDocuments"
    ).textContent =
        results[3].count ?? 0;


    // ========================================================
    // ACTIVITE
    // ========================================================

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


    if (logs?.length) {

        recent.innerHTML =

            logs
                .map(
                    log => `

                        <div class="event">

                            <b>
                                ${esc(
                                    log.action
                                )}
                            </b>

                            <small>
                                ${new Date(
                                    log.created_at
                                ).toLocaleString(
                                    "fr-FR"
                                )}
                            </small>

                        </div>

                    `
                )
                .join("");


    } else {

        recent.textContent =
            "Aucune activité récente.";

    }


    // ========================================================
    // AGENDA
    // ========================================================

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


    if (events?.length) {

        eventsElement.innerHTML =

            events
                .map(
                    event => `

                        <div class="event">

                            <b>
                                ${esc(
                                    event.title
                                )}
                            </b>

                            <small>
                                ${new Date(
                                    event.event_date
                                ).toLocaleString(
                                    "fr-FR"
                                )}
                            </small>

                        </div>

                    `
                )
                .join("");


    } else {

        eventsElement.textContent =
            "Aucun événement à venir.";

    }

}


// ============================================================
// PAGES GENERIQUES
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

                    Erreur :
                    ${esc(error.message)}

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

                Données partagées de la Mairie
                de San Andreas.

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
    ).onclick =
        () => openAdd(
            table,
            label
        );


    document.querySelector(
        "#search"
    ).oninput =
        event => {

            const value =
                event.target.value
                    .toLowerCase();


            renderRows(

                (data || [])
                    .filter(
                        item =>
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


// ============================================================
// AFFICHER LES LIGNES
// ============================================================

function renderRows(
    rows,
    table
) {

    const container =
        document.querySelector(
            "#rows"
        );


    if (!container) {

        return;

    }


    container.innerHTML =

        rows.length

            ? rows
                .map(
                    item => `

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
                                        item.details
                                        || ""
                                    )}

                                </span>

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
                                        class="danger-btn"
                                        data-del="${item.id}"
                                    >
                                        Supprimer
                                    </button>

                                </div>

                            </td>

                        </tr>

                    `
                )
                .join("")


            : `

                <tr>

                    <td colspan="3">

                        <div class="empty">

                            Aucune donnée.

                        </div>

                    </td>

                </tr>

            `;


    document
        .querySelectorAll(
            "[data-del]"
        )
        .forEach(
            button => {

                button.onclick =
                    async () => {

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


                        loadPage(
                            currentPage()
                        );

                    };

            }
        );

}


// ============================================================
// AJOUTER UN ELEMENT
// ============================================================

function openAdd(
    table,
    label
) {

    document.querySelector(
        "#modalRoot"
    ).innerHTML = `

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
    ).onclick =
        () => {

            document.querySelector(
                "#modalRoot"
            ).innerHTML = "";

        };


    document.querySelector(
        "#addForm"
    ).onsubmit =
        async event => {

            event.preventDefault();


            const payload = {

                title:
                    document.querySelector(
                        "#title"
                    ).value
                    .trim(),

                details:
                    document.querySelector(
                        "#details"
                    ).value
                    .trim(),

                created_by:
                    user.id

            };


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


            document.querySelector(
                "#modalRoot"
            ).innerHTML = "";


            loadPage(
                currentPage()
            );

        };

}


// ============================================================
// DEMANDES DE COMPTES
// ============================================================

async function requests() {

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

                Gérez les demandes d'accès
                à la Mairie.

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
                        data?.length

                            ? data
                                .map(
                                    request => `

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
                                                    request.reason
                                                    || "—"
                                                )}
                                            </td>

                                            <td>
                                                ${esc(
                                                    request.status
                                                )}
                                            </td>

                                            <td>

                                                ${
                                                    request.status
                                                    === "pending"

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

                                    `
                                )
                                .join("")


                            : `

                                <tr>

                                    <td colspan="6">

                                        <div class="empty">

                                            Aucune demande.

                                        </div>

                                    </td>

                                </tr>

                            `
                    }

                </tbody>

            </table>

        </div>

    `;


    document
        .querySelectorAll(
            "[data-approve]"
        )
        .forEach(
            button => {

                button.onclick =
                    () =>
                        decideRequest(
                            button.dataset.approve,
                            "approved"
                        );

            }
        );


    document
        .querySelectorAll(
            "[data-reject]"
        )
        .forEach(
            button => {

                button.onclick =
                    () =>
                        decideRequest(
                            button.dataset.reject,
                            "rejected"
                        );

            }
        );

}


// ============================================================
// DECISION DEMANDE
// ============================================================

async function decideRequest(
    id,
    status
) {

    alert(
        "La gestion automatique de création du compte sera activée avec la prochaine étape du système."
    );

}


// ============================================================
// GESTION DES COMPTES
// ============================================================

async function users() {

    if (!user.isAdmin) {

        return accessDenied();

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
            created_at
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
                            Nom affiché
                        </th>

                        <th>
                            Statut
                        </th>

                    </tr>

                </thead>


                <tbody>

                    ${
                        data?.length

                            ? data
                                .map(
                                    account => `

                                        <tr>

                                            <td>

                                                <strong>

                                                    ${esc(
                                                        account.username
                                                    )}

                                                </strong>

                                            </td>

                                            <td>

                                                ${esc(
                                                    account.display_name
                                                )}

                                            </td>

                                            <td>

                                                ${
                                                    account.active

                                                        ? "Actif"

                                                        : "Désactivé"
                                                }

                                            </td>

                                        </tr>

                                    `
                                )
                                .join("")


                            : `

                                <tr>

                                    <td colspan="3">

                                        <div class="empty">

                                            Aucun compte.

                                        </div>

                                    </td>

                                </tr>

                            `
                    }

                </tbody>

            </table>

        </div>

    `;

}


// ============================================================
// GESTION DES ROLES ET PERMISSIONS
// ============================================================

async function permissions() {

    if (!user.isAdmin) {

        return accessDenied();

    }


    const {
        data: roles
    } = await supabase
        .from("roles")
        .select("*")
        .order(
            "name"
        );


    content.innerHTML = `

        <div class="page-intro">

            <h2>
                Rôles & Permissions
            </h2>

            <p class="muted">

                Gérez les rôles et les permissions
                de la Mairie.

            </p>

        </div>


        <div class="panel">

            <h3>
                Rôles existants
            </h3>


            <div class="cards">

                ${
                    roles?.length

                        ? roles
                            .map(
                                role => `

                                    <div class="stat-card">

                                        <strong>

                                            ${esc(
                                                role.icon
                                                || ""
                                            )}

                                            ${esc(
                                                role.name
                                            )}

                                        </strong>

                                        <small>

                                            ${esc(
                                                role.description
                                                || ""
                                            )}

                                        </small>

                                        ${
                                            role.is_admin

                                                ? "<b>👑 Administrateur</b>"

                                                : ""
                                        }

                                    </div>

                                `
                            )
                            .join("")


                        : "<p>Aucun rôle.</p>"
                }

            </div>

        </div>

    `;

}


// ============================================================
// PAGE ACTUELLE
// ============================================================

function currentPage() {

    return (

        document
            .querySelector(
                ".nav-item.active"
            )
            ?.dataset
            .page

        || "dashboard"

    );

}


// ============================================================
// REALTIME
// ============================================================

supabase
    .channel(
        "msa-live"
    )
    .on(

        "postgres_changes",

        {
            event: "*",
            schema: "public"
        },

        () => {

            if (
                currentPage()
                === "dashboard"
            ) {

                dashboard();

            }

        }

    )
    .subscribe();


// ============================================================
// LANCEMENT
// ============================================================

loadPage(
    "dashboard"
);
