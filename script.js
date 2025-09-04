// Configuration
const CONFIG = {
    sections: {
        'informations': 'sections/informations.md',
        'education': 'sections/education.md',
        'experiences': 'sections/experiences.md',
        'competences': 'sections/competences.md',
        'portfolio': 'sections/portfolio.md'
    },
    templates: {
        'informations': 'templates/informations.html',
        'education': 'templates/education.html',
        'experiences': 'templates/experiences.html',
        'competences': 'templates/competences.html',
        'portfolio': 'templates/portfolio.html'
    }
};

// État de l'application
let currentSection = 'accueil';
let loadedSections = new Set();

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeMobileMenu();
    loadMarkdownContent();
    
    // Gestion du scroll pour la navigation
    window.addEventListener('scroll', handleScroll);
    
    // Gestion des raccourcis clavier
    document.addEventListener('keydown', handleKeyboard);
});

// Navigation
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const sectionId = this.getAttribute('data-section');
            if (!sectionId) {
                return; // lien externe ou vers une autre page: laisser le comportement par défaut
            }
            e.preventDefault();
            showSection(sectionId);
        });
    });
}

function showSection(sectionId) {
    // Masquer toutes les sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Afficher la section demandée
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        currentSection = sectionId;
        
        // Charger le contenu markdown si nécessaire
        if (CONFIG.sections[sectionId] && !loadedSections.has(sectionId)) {
            loadSectionContent(sectionId);
        }
        
        // Mettre à jour la navigation
        updateNavigation(sectionId);
        
        // Scroll vers le haut
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function updateNavigation(activeSectionId) {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-section') === activeSectionId) {
            link.classList.add('active');
        }
    });
}

// Menu mobile
function initializeMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
        
        // Fermer le menu lors du clic sur un lien
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
                hamburger.classList.remove('active');
            });
        });
    }
}

// Chargement du contenu markdown
async function loadMarkdownContent() {
    // Charger le contenu de la section active si ce n'est pas l'accueil
    if (currentSection !== 'accueil' && CONFIG.sections[currentSection]) {
        await loadSectionContent(currentSection);
    }
}

async function loadSectionContent(sectionId) {
    const contentElement = document.getElementById(`${sectionId}-content`);
    if (!contentElement) return;
    
    // Afficher un indicateur de chargement
    contentElement.innerHTML = '<div class="loading">Chargement...</div>';
    
    try {
        // Vérifier le cache d'abord
        let markdownText = sessionStorage.getItem(`section_${sectionId}`);
        let templateHtml = sessionStorage.getItem(`template_${sectionId}`);
        
        // Si pas en cache, charger depuis les fichiers
        if (!markdownText || !templateHtml) {
            const [markdownResponse, templateResponse] = await Promise.all([
                fetch(CONFIG.sections[sectionId]),
                fetch(CONFIG.templates[sectionId])
            ]);
            
            if (!markdownResponse.ok) {
                throw new Error(`Erreur ${markdownResponse.status}: ${markdownResponse.statusText}`);
            }
            
            if (!templateResponse.ok) {
                throw new Error(`Erreur template ${templateResponse.status}: ${templateResponse.statusText}`);
            }
            
            markdownText = await markdownResponse.text();
            templateHtml = await templateResponse.text();
            
            // Mettre en cache
            sessionStorage.setItem(`section_${sectionId}`, markdownText);
            sessionStorage.setItem(`template_${sectionId}`, templateHtml);
        }
        
        // Convertir le Markdown en HTML
        const markdownHtml = marked.parse(markdownText);
        
        // Parser le Markdown pour extraire les données structurées
        const structuredData = parseMarkdownToStructuredData(markdownText, sectionId);
        
        // Appliquer le template avec les données
        const finalHtml = applyTemplate(templateHtml, structuredData, markdownHtml);
        
        contentElement.innerHTML = finalHtml;
        loadedSections.add(sectionId);
        
        // Ajouter des animations aux éléments chargés
        animateContent(contentElement);
        
    } catch (error) {
        console.error('Erreur lors du chargement du contenu:', error);
        contentElement.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-light);">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>Erreur lors du chargement du contenu.</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">${error.message}</p>
            </div>
        `;
    }
}

// Parser le Markdown pour extraire les données structurées
function parseMarkdownToStructuredData(markdownText, sectionId) {
    const lines = markdownText.split('\n');
    const data = {};
    
    switch (sectionId) {
        case 'informations':
            return parseInformationsData(lines);
        case 'experiences':
            return parseExperiencesData(lines);
        case 'education':
            return parseEducationData(lines);
        case 'portfolio':
            return parsePortfolioData(lines);
        case 'competences':
            return parseCompetencesData(lines);
        default:
            return {};
    }
}

// Parser pour les informations personnelles
function parseInformationsData(lines) {
    const data = {
        nom: '',
        profession: '',
        date_naissance: '',
        email: '',
        telephone: '',
        adresse: '',
        linkedin: '',
        github: '',
        apropos: '',
        langues: [],
        interets: []
    };
    
    let currentSection = '';
    let aboutText = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('## Contact')) {
            currentSection = 'contact';
        } else if (line.startsWith('## À propos')) {
            currentSection = 'apropos';
        } else if (line.startsWith('## Langues')) {
            currentSection = 'langues';
        } else if (line.startsWith('## Centres d\'intérêt')) {
            currentSection = 'interets';
        } else if (line.startsWith('- **Nom :**')) {
            data.nom = line.replace('- **Nom :**', '').trim();
        } else if (line.startsWith('- **Profession :**')) {
            data.profession = line.replace('- **Profession :**', '').trim();
        } else if (line.startsWith('- **Date de naissance :**')) {
            data.date_naissance = line.replace('- **Date de naissance :**', '').trim();
        } else if (line.startsWith('- **Email :**')) {
            data.email = line.replace('- **Email :**', '').trim();
        } else if (line.startsWith('- **Téléphone :**')) {
            data.telephone = line.replace('- **Téléphone :**', '').trim();
        } else if (line.startsWith('- **Adresse :**')) {
            data.adresse = line.replace('- **Adresse :**', '').trim();
        } else if (line.startsWith('- **LinkedIn :**')) {
            data.linkedin = line.replace('- **LinkedIn :**', '').trim();
        } else if (line.startsWith('- **GitHub :**')) {
            data.github = line.replace('- **GitHub :**', '').trim();
        } else if (currentSection === 'apropos' && line && !line.startsWith('##')) {
            aboutText.push(line);
        } else if (currentSection === 'langues' && line.startsWith('- ')) {
            // Supporte "- **Français :** Niveau" ou "- Français : Niveau" ou "- Français: Niveau"
            const match = line.match(/-\s*(?:\*\*(.+?)\s*:\*\*|([^:]+))\s*:??\s*(.+)/);
            if (match) {
                const nom = (match[1] || match[2] || '').trim();
                const niveau = (match[3] || '').trim();
                if (nom && niveau) {
                    data.langues.push({ nom, niveau });
                }
            }
        } else if (currentSection === 'interets' && line.startsWith('- ')) {
            data.interets.push({
                nom: line.replace('- ', ''),
                description: ''
            });
        }
    }
    
    data.apropos = aboutText.join(' ');
    return data;
}

// Parser pour les expériences
function parseExperiencesData(lines) {
    const experiences = [];
    let currentExp = null;
    let currentSection = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('## ') && line.includes(' - ')) {
            if (currentExp) {
                experiences.push(currentExp);
            }
            const match = line.match(/## (.+?) - (.+)/);
            if (match) {
                currentExp = {
                    titre: match[1],
                    periode: match[2],
                    entreprise: '',
                    lieu: '',
                    type: '',
                    missions: [],
                    competences: [],
                    realisations: []
                };
            }
        } else if (line.startsWith('**Entreprise :**')) {
            currentExp.entreprise = line.replace('**Entreprise :**', '').trim();
        } else if (line.startsWith('**Lieu :**')) {
            currentExp.lieu = line.replace('**Lieu :**', '').trim();
        } else if (line.startsWith('**Type :**')) {
            currentExp.type = line.replace('**Type :**', '').trim();
        } else if (line.startsWith('### Missions principales :')) {
            currentSection = 'missions';
        } else if (line.startsWith('### Compétences développées :')) {
            currentSection = 'competences';
        } else if (line.startsWith('### Réalisations :')) {
            currentSection = 'realisations';
        } else if (line.startsWith('- ') && currentSection) {
            const item = line.replace('- ', '');
            if (currentSection === 'missions') {
                currentExp.missions.push(item);
            } else if (currentSection === 'competences') {
                currentExp.competences.push(item);
            } else if (currentSection === 'realisations') {
                currentExp.realisations.push(item);
            }
        }
    }
    
    if (currentExp) {
        experiences.push(currentExp);
    }
    
    return { experiences };
}

// Parser pour l'éducation
function parseEducationData(lines) {
    const data = {
        formations: [],
        certifications: [],
        formations_continue: [],
        timeline: []
    };
    
    let currentSection = '';
    let currentItem = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('## Formation Supérieure')) {
            currentSection = 'formations';
        } else if (line.startsWith('## Certifications')) {
            currentSection = 'certifications';
        } else if (line.startsWith('## Formation Continue')) {
            currentSection = 'formations_continue';
        } else if (line.startsWith('### ') && line.includes(' - ')) {
            if (currentItem) {
                if (currentSection === 'formations') {
                    data.formations.push(currentItem);
                } else if (currentSection === 'certifications') {
                    data.certifications.push(currentItem);
                } else if (currentSection === 'formations_continue') {
                    data.formations_continue.push(currentItem);
                }
            }
            
            const match = line.match(/### (.+?) - (.+)/);
            if (match) {
                currentItem = {
                    nom: match[1],
                    annee: match[2],
                    ecole: '',
                    lieu: '',
                    specialisation: '',
                    mention: '',
                    projets: [],
                    organisme: '',
                    duree: '',
                    competences: [],
                    objectif: ''
                };
            }
        } else if (line.startsWith('**École/Université :**')) {
            currentItem.ecole = line.replace('**École/Université :**', '').trim();
        } else if (line.startsWith('**Organisme :**')) {
            currentItem.organisme = line.replace('**Organisme :**', '').trim();
        } else if (line.startsWith('**Lieu :**')) {
            currentItem.lieu = line.replace('**Lieu :**', '').trim();
        } else if (line.startsWith('**Spécialisation :**')) {
            currentItem.specialisation = line.replace('**Spécialisation :**', '').trim();
        } else if (line.startsWith('**Mention :**')) {
            currentItem.mention = line.replace('**Mention :**', '').trim();
        } else if (line.startsWith('**Durée :**')) {
            currentItem.duree = line.replace('**Durée :**', '').trim();
        } else if (line.startsWith('**Objectif :**')) {
            currentItem.objectif = line.replace('**Objectif :**', '').trim();
        } else if (line.startsWith('**Projets marquants :**')) {
            // Les projets suivent cette ligne
        } else if (line.startsWith('**Compétences acquises :**')) {
            // Les compétences suivent cette ligne
        } else if (line.startsWith('- ') && currentItem) {
            const item = line.replace('- ', '');
            if (currentSection === 'formations') {
                currentItem.projets.push(item);
            } else if (currentSection === 'certifications') {
                currentItem.competences.push(item);
            }
        }
    }
    
    // Ajouter le dernier élément
    if (currentItem) {
        if (currentSection === 'formations') {
            data.formations.push(currentItem);
        } else if (currentSection === 'certifications') {
            data.certifications.push(currentItem);
        } else if (currentSection === 'formations_continue') {
            data.formations_continue.push(currentItem);
        }
    }

    // Trier chaque liste par année décroissante (plus récent -> plus ancien)
    const extractMostRecentYear = (value) => {
        if (!value) return -Infinity;
        const matches = String(value).match(/\d{4}/g);
        if (!matches || matches.length === 0) return -Infinity;
        return Math.max(...matches.map(Number));
    };

    ['formations', 'certifications', 'formations_continue'].forEach((key) => {
        if (Array.isArray(data[key])) {
            data[key].sort((a, b) => extractMostRecentYear(b.annee) - extractMostRecentYear(a.annee));
        }
    });

    // Construire une timeline unique triée décroissante
    const combined = []
        .concat(
            data.formations.map(it => ({ ...it, etablissement: it.ecole || '' })),
            data.certifications.map(it => ({ ...it, etablissement: it.organisme || '' })),
            data.formations_continue.map(it => ({ ...it, etablissement: it.organisme || '' }))
        );
    combined.sort((a, b) => extractMostRecentYear(b.annee) - extractMostRecentYear(a.annee));
    data.timeline = combined;

    return data;
}

// Parser pour le portfolio
function parsePortfolioData(lines) {
    const data = {
        projets_professionnels: [],
        projets_personnels: [],
        contributions_opensource: [],
        realisations: []
    };
    
    let currentSection = '';
    let currentItem = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('## Projets Professionnels')) {
            currentSection = 'projets_professionnels';
        } else if (line.startsWith('## Projets Personnels')) {
            currentSection = 'projets_personnels';
        } else if (line.startsWith('## Contributions Open Source')) {
            currentSection = 'contributions_opensource';
        } else if (line.startsWith('## Réalisations & Distinctions')) {
            currentSection = 'realisations';
        } else if (line.startsWith('### ') && !line.includes('##')) {
            if (currentItem) {
                if (currentSection === 'projets_professionnels') {
                    data.projets_professionnels.push(currentItem);
                } else if (currentSection === 'projets_personnels') {
                    data.projets_personnels.push(currentItem);
                } else if (currentSection === 'contributions_opensource') {
                    data.contributions_opensource.push(currentItem);
                } else if (currentSection === 'realisations') {
                    data.realisations.push(currentItem);
                }
            }
            
            currentItem = {
                nom: line.replace('### ', ''),
                periode: '',
                technologies: '',
                role: '',
                statut: '',
                description: '',
                fonctionnalites: [],
                defis: [],
                impact: [],
                apprentissages: [],
                lien_projet: '',
                code_source: '',
                contribution: '',
                lien_contribution: '',
                date: '',
                organisme: ''
            };
        } else if (line.startsWith('**Période :**')) {
            currentItem.periode = line.replace('**Période :**', '').trim();
        } else if (line.startsWith('**Technologies :**')) {
            currentItem.technologies = line.replace('**Technologies :**', '').trim();
        } else if (line.startsWith('**Rôle :**')) {
            currentItem.role = line.replace('**Rôle :**', '').trim();
        } else if (line.startsWith('**Statut :**')) {
            currentItem.statut = line.replace('**Statut :**', '').trim();
        } else if (line.startsWith('**Contribution :**')) {
            currentItem.contribution = line.replace('**Contribution :**', '').trim();
        } else if (line.startsWith('**Date :**')) {
            currentItem.date = line.replace('**Date :**', '').trim();
        } else if (line.startsWith('**Organisme :**')) {
            currentItem.organisme = line.replace('**Organisme :**', '').trim();
        } else if (line.startsWith('**Description :**')) {
            // La description suit cette ligne
        } else if (line.startsWith('**Fonctionnalités principales :**') || line.startsWith('**Fonctionnalités :**')) {
            // Les fonctionnalités suivent
        } else if (line.startsWith('**Défis relevés :**')) {
            // Les défis suivent
        } else if (line.startsWith('**Impact :**')) {
            // L'impact suit
        } else if (line.startsWith('**Apprentissages :**')) {
            // Les apprentissages suivent
        } else if (line.startsWith('**Lien :**')) {
            currentItem.lien_projet = line.replace('**Lien :**', '').trim();
        } else if (line.startsWith('**Code source :**')) {
            currentItem.code_source = line.replace('**Code source :**', '').trim();
        } else if (line.startsWith('- ') && currentItem) {
            const item = line.replace('- ', '');
            // Déterminer dans quelle liste ajouter selon le contexte
            if (line.includes('fonctionnalité') || currentItem.fonctionnalites.length > 0) {
                currentItem.fonctionnalites.push(item);
            } else if (line.includes('défi') || currentItem.defis.length > 0) {
                currentItem.defis.push(item);
            } else if (line.includes('impact') || currentItem.impact.length > 0) {
                currentItem.impact.push(item);
            } else if (line.includes('apprentissage') || currentItem.apprentissages.length > 0) {
                currentItem.apprentissages.push(item);
            }
        } else if (line && !line.startsWith('#') && !line.startsWith('**') && !line.startsWith('-') && currentItem) {
            // Description textuelle
            if (!currentItem.description) {
                currentItem.description = line;
            }
        }
    }
    
    // Ajouter le dernier élément
    if (currentItem) {
        if (currentSection === 'projets_professionnels') {
            data.projets_professionnels.push(currentItem);
        } else if (currentSection === 'projets_personnels') {
            data.projets_personnels.push(currentItem);
        } else if (currentSection === 'contributions_opensource') {
            data.contributions_opensource.push(currentItem);
        } else if (currentSection === 'realisations') {
            data.realisations.push(currentItem);
        }
    }
    
    return data;
}

// Parser pour les qualités
function parseCompetencesData(lines) {
    const data = {
        langages: [],
        frameworks: [],
        outils: [],
        gestion_projet: [],
        communication: [],
        resolution_problemes: [],
        leadership: [],
        adaptabilite: [],
        competences: [],
        competences_maitrise: []
    };
    
    let currentSection = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('### Langages de Programmation')) {
            currentSection = 'langages';
        } else if (line.startsWith('### Frameworks & Bibliothèques')) {
            currentSection = 'frameworks';
        } else if (line.startsWith('### Outils & Technologies')) {
            currentSection = 'outils';
        } else if (line.startsWith('### Gestion de Projet')) {
            currentSection = 'gestion_projet';
        } else if (line.startsWith('### Communication')) {
            currentSection = 'communication';
        } else if (line.startsWith('### Résolution de Problèmes')) {
            currentSection = 'resolution_problemes';
        } else if (line.startsWith('### Leadership')) {
            currentSection = 'leadership';
        } else if (line.startsWith('### Adaptabilité')) {
            currentSection = 'adaptabilite';
        } else if (line.startsWith('### Compétences')) {
            currentSection = 'competences';
        } else if (line.startsWith('## Niveau de Maîtrise')) {
            currentSection = 'competences_maitrise';
        } else if (line.startsWith('- **') && currentSection) {
            const match = line.match(/- \*\*(.+?) :\*\* (.+)/);
            if (match) {
                const item = {
                    nom: match[1],
                    niveau: match[2]
                };
                
                if (currentSection === 'langages') {
                    data.langages.push(item);
                } else if (currentSection === 'frameworks') {
                    data.frameworks.push(item);
                } else if (currentSection === 'outils') {
                    data.outils.push(item);
                }
            }
        } else if (line.startsWith('- ') && currentSection && !line.startsWith('- **')) {
            const item = line.replace('- ', '');
            
            if (currentSection === 'gestion_projet') {
                data.gestion_projet.push(item);
            } else if (currentSection === 'communication') {
                data.communication.push(item);
            } else if (currentSection === 'resolution_problemes') {
                data.resolution_problemes.push(item);
            } else if (currentSection === 'leadership') {
                data.leadership.push(item);
            } else if (currentSection === 'adaptabilite') {
                data.adaptabilite.push(item);
            } else if (currentSection === 'competences') {
                data.competences.push(item);
            }
        } else if (line.startsWith('||') && currentSection === 'competences_maitrise') {
            // Parser le tableau de maîtrise
            const parts = line.split('|').filter(part => part.trim());
            if (parts.length >= 3) {
                const competence = parts[0].trim();
                const etoiles = parts[1].trim();
                const experience = parts[2].trim();
                
                // Compter les étoiles
                const niveau = (etoiles.match(/⭐/g) || []).length;
                
                data.competences_maitrise.push({
                    nom: competence,
                    etoiles: etoiles,
                    niveau: niveau,
                    experience: experience
                });
            }
        }
    }
    
    return data;
}

// Appliquer le template avec les données
function applyTemplate(templateHtml, structuredData, markdownHtml) {
    // Simple template engine basé sur Mustache
    let result = templateHtml;

    // 1) Remplacer d'abord les listes pour éviter que les variables scalaires
    // (ex: {{nom}} du profil) n'écrasent celles des items de liste
    // (ex: {{nom}} d'une langue).
    Object.keys(structuredData).forEach(key => {
        if (Array.isArray(structuredData[key])) {
            const listRegex = new RegExp(`{{#${key}}}([\\s\\S]*?){{\/${key}}}`, 'g');
            result = result.replace(listRegex, (match, content) => {
                return structuredData[key].map(item => {
                    let itemContent = content;
                    if (typeof item === 'object' && item !== null) {
                        Object.keys(item).forEach(itemKey => {
                            const itemRegex = new RegExp(`{{${itemKey}}}`, 'g');
                            itemContent = itemContent.replace(itemRegex, item[itemKey] || '');
                        });
                    } else {
                        itemContent = itemContent.replace(/{{\.}}/g, String(item));
                    }
                    return itemContent;
                }).join('');
            });
        }
    });

    // 2) Puis remplacer les variables simples restantes
    Object.keys(structuredData).forEach(key => {
        if (typeof structuredData[key] === 'string') {
            const regex = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(regex, structuredData[key]);
        }
    });

    // 3) Nettoyer les variables non remplacées
    result = result.replace(/{{[^}]+}}/g, '');

    return result;
}

// Animation du contenu
function animateContent(element) {
    const children = element.children;
    Array.from(children).forEach((child, index) => {
        child.style.opacity = '0';
        child.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            child.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            child.style.opacity = '1';
            child.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Gestion du scroll
function handleScroll() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.style.boxShadow = 'var(--shadow-md)';
    } else {
        navbar.style.boxShadow = 'none';
    }
}

// Raccourcis clavier
function handleKeyboard(e) {
    // Navigation avec les flèches gauche/droite
    if (e.altKey) {
        const sections = ['accueil', 'informations', 'education', 'experiences', 'compétences', 'portfolio'];
        const currentIndex = sections.indexOf(currentSection);
        
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
            e.preventDefault();
            showSection(sections[currentIndex - 1]);
        } else if (e.key === 'ArrowRight' && currentIndex < sections.length - 1) {
            e.preventDefault();
            showSection(sections[currentIndex + 1]);
        }
    }
    
    // Raccourci pour retourner à l'accueil
    if (e.key === 'Home' && e.ctrlKey) {
        e.preventDefault();
        showSection('accueil');
    }
}

// Utilitaires
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Gestion des erreurs globales
window.addEventListener('error', function(e) {
    console.error('Erreur JavaScript:', e.error);
});

// Gestion des erreurs de promesses non capturées
window.addEventListener('unhandledrejection', function(e) {
    console.error('Promesse rejetée non gérée:', e.reason);
});

// Fonction pour recharger le contenu d'une section
function reloadSection(sectionId) {
    if (loadedSections.has(sectionId)) {
        loadedSections.delete(sectionId);
        loadSectionContent(sectionId);
    }
}

// Fonction pour précharger le contenu des sections
async function preloadSections() {
    const promises = Object.keys(CONFIG.sections).map(async (sectionId) => {
        try {
            // Précharger le contenu Markdown
            const markdownResponse = await fetch(CONFIG.sections[sectionId]);
            if (markdownResponse.ok) {
                const markdownContent = await markdownResponse.text();
                sessionStorage.setItem(`section_${sectionId}`, markdownContent);
            }
            
            // Précharger le template HTML
            const templateResponse = await fetch(CONFIG.templates[sectionId]);
            if (templateResponse.ok) {
                const templateContent = await templateResponse.text();
                sessionStorage.setItem(`template_${sectionId}`, templateContent);
            }
        } catch (error) {
            console.warn(`Impossible de précharger la section ${sectionId}:`, error);
        }
    });
    
    await Promise.all(promises);
}

// Précharger le contenu après le chargement initial
setTimeout(preloadSections, 1000);

// Export des fonctions pour utilisation externe
window.CVApp = {
    showSection,
    reloadSection,
    preloadSections
};
