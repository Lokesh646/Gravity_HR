// New Hierarchical Structure: Manager -> Team Leader -> Team Member
const managerData = [
    {
        id: "M1",
        name: "Karthik",
        role: "Manager",
        teamLeaders: [
            {
                id: 1,
                name: "Raj",
                role: "Team Leader",
                team: [
                    { id: 101, name: "Mani", status: "Active" },
                    { id: 102, name: "Kumar", status: "Inactive" },
                    { id: 103, name: "Suresh", status: "Active" }
                ]
            },
            {
                id: 2,
                name: "Priya",
                role: "Team Leader",
                team: [
                    { id: 201, name: "Anitha", status: "Active" },
                    { id: 202, name: "Vijay", status: "Active" }
                ]
            }
        ]
    },
    {
        id: "M2",
        name: "Sarah",
        role: "Manager",
        teamLeaders: [
            {
                id: 3,
                name: "Arun",
                role: "Team Leader",
                team: [
                    { id: 301, name: "Vikram", status: "Inactive" },
                    { id: 302, name: "Deepak", status: "Active" },
                    { id: 303, name: "Rahul", status: "Inactive" },
                    { id: 304, name: "Sathish", status: "Active" }
                ]
            }
        ]
    }
];

// Helper functions to work with the data (Updated for new structure)
function getAllManagers() {
    return managerData;
}

function getAllTeamLeaders() {
    // Flatten the structure to get all TLs
    let allTLs = [];
    managerData.forEach(manager => {
        allTLs = allTLs.concat(manager.teamLeaders);
    });
    return allTLs;
}

function getTeamByLeaderId(id) {
    const allTLs = getAllTeamLeaders();
    return allTLs.find(leader => leader.id === parseInt(id));
}

function getStats() {
    let totalManagers = managerData.length;
    let totalTeamLeaders = 0;
    let totalEmployees = 0;
    let currentlyActive = 0;
    let currentlyInactive = 0;

    managerData.forEach(manager => {
        totalTeamLeaders += manager.teamLeaders.length;
        manager.teamLeaders.forEach(leader => {
            totalEmployees += leader.team.length;
            leader.team.forEach(member => {
                if (member.status === "Active") {
                    currentlyActive++;
                } else {
                    currentlyInactive++;
                }
            });
        });
    });

    return {
        totalManagers,
        totalTeamLeaders,
        totalEmployees,
        currentlyActive,
        currentlyInactive
    };
}

function getTeamLeaderStats(leaderName) {
    const allTLs = getAllTeamLeaders();
    const leader = allTLs.find(l => l.name === leaderName);
    if (!leader) return { total: 0, active: 0, inactive: 0 };

    let total = leader.team.length;
    let active = leader.team.filter(m => m.status === "Active").length;
    let inactive = total - active;

    return { total, active, inactive };
}

// Kept for backward compatibility if anything else uses teamData directly
const teamData = getAllTeamLeaders();

window.DashboardData = {
    managerData,
    teamData,
    getAllManagers,
    getAllTeamLeaders,
    getTeamByLeaderId,
    getStats,
    getTeamLeaderStats
};
