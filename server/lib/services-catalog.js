'use strict';

/**
 * Service codes team members can offer (aligned with deploy pricing / booking form).
 */
const OFFERABLE_SERVICES_CATALOG = [
    {
        section: 'Orthopaedic procedures',
        items: [
            { id: 'fracture_repair_simple', label: 'Fracture Repair (Simple)' },
            { id: 'fracture_repair_complex', label: 'Fracture Repair (Complex)' },
            { id: 'tplo', label: 'Tibial Plateau Levelling Osteotomy (TPLO)' },
            { id: 'fho', label: 'Femoral Head and Neck Excision (FHO)' },
            { id: 'medial_patella_luxation_repair', label: 'Medial Patella Luxation Repair' },
            { id: 'carpal_arthrodesis', label: 'Carpal Arthrodesis' },
            { id: 'tarsal_arthrodesis', label: 'Tarsal Arthrodesis' },
            { id: 'hif_repair', label: 'Humeral Intracondylar Fissure (HIF) Repair' },
            { id: 'angular_limb_deformity_correction', label: 'Angular Limb Deformity Correction' }
        ]
    },
    {
        section: 'Soft tissue procedures',
        items: [
            { id: 'perineal_urethrostomy', label: 'Perineal Urethrostomy' },
            { id: 'tecabo', label: 'Total Ear Canal Ablation & Bulla Osteotomy (TECABO)' },
            { id: 'mass_excision_simple', label: 'Mass Excision (Simple)' },
            { id: 'mass_excision_complex', label: 'Mass Excision with Complex Reconstruction' },
            { id: 'diaphragmatic_hernia_repair', label: 'Diaphragmatic Hernia Repair' },
            { id: 'perineal_hernia_repair', label: 'Perineal Hernia Repair' },
            { id: 'nephrectomy', label: 'Nephrectomy' },
            { id: 'liver_lobectomy', label: 'Liver Lobectomy' }
        ]
    },
    {
        section: 'Minimally invasive',
        items: [{ id: 'laparoscopic_surgery', label: 'Laparoscopic surgery' }]
    },
    {
        section: 'Diagnostic services',
        items: [
            { id: 'ultrasonography_abdominal', label: 'Ultrasonography (Abdominal)' },
            { id: 'echocardiography', label: 'Echocardiography' },
            { id: 'endoscopy_gastroscopy_colonoscopy', label: 'Endoscopy (Gastroscopy/Colonoscopy)' },
            { id: 'radiographic_interpretation', label: 'Radiographic Interpretation (Member Practices)' },
            { id: 'consultation_advice', label: 'Consultation & Advice (Member Practices)' }
        ]
    },
    {
        section: 'Other',
        items: [{ id: 'veterinary_locum', label: 'Veterinary locum' }]
    }
];

const OFFERABLE_SERVICE_IDS = OFFERABLE_SERVICES_CATALOG.flatMap(s => s.items.map(i => i.id));

module.exports = {
    OFFERABLE_SERVICES_CATALOG,
    OFFERABLE_SERVICE_IDS
};
