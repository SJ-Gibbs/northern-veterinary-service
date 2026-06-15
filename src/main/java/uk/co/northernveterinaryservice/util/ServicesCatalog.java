package uk.co.northernveterinaryservice.util;

import java.util.List;
import java.util.Set;

/**
 * Service codes team members can offer — mirrors server/lib/services-catalog.js.
 */
public final class ServicesCatalog {

    private ServicesCatalog() {}

    public static final List<String> OFFERABLE_SERVICE_IDS = List.of(
        "fracture_repair_simple",
        "fracture_repair_complex",
        "tplo",
        "fho",
        "medial_patella_luxation_repair",
        "carpal_arthrodesis",
        "tarsal_arthrodesis",
        "hif_repair",
        "angular_limb_deformity_correction",
        "perineal_urethrostomy",
        "tecabo",
        "mass_excision_simple",
        "mass_excision_complex",
        "diaphragmatic_hernia_repair",
        "perineal_hernia_repair",
        "nephrectomy",
        "liver_lobectomy",
        "laparoscopic_surgery",
        "ultrasonography_abdominal",
        "echocardiography",
        "endoscopy_gastroscopy_colonoscopy",
        "radiographic_interpretation",
        "consultation_advice",
        "veterinary_locum"
    );

    public static final Set<String> OFFERABLE_SERVICE_IDS_SET = Set.copyOf(OFFERABLE_SERVICE_IDS);
}
