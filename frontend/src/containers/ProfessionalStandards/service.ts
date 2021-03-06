import AnalyticsService from "../../service/analytics-service";
import {ProfessionalStandardFields} from "./enum";
import {SortingType, Types} from "../../components/SortingButton/types";

class ProfessionalStandardsService extends AnalyticsService{
    getProfessionalStandards(currentPage: number, searchQuery: string, sortingField: string, sortingMode: SortingType){
        const sortingSymbol = sortingMode === Types.ASC ? '-' : sortingMode === Types.DESC ? '+' : '';

        return this.get(`/api/professionalstandard?page=${currentPage}&search=${searchQuery}&ordering=${sortingSymbol}${sortingField}`);
    }

    deleteProfessionalStandards(id: number){
        return this.delete(`/api/professionalstandard/${id}`);
    }

    createProfessionalStandards(ProfessionalStandard: any){
        const formData = new FormData();

        formData.append(ProfessionalStandardFields.TITLE, ProfessionalStandard[ProfessionalStandardFields.TITLE]);
        formData.append(ProfessionalStandardFields.NUMBER, ProfessionalStandard[ProfessionalStandardFields.NUMBER]);

        return this.post(`api/professionalstandard/`, formData);
    }

    changeProfessionalStandards(ProfessionalStandard: any){
        const formData = new FormData();
        const id = ProfessionalStandard[ProfessionalStandardFields.ID];

        formData.append(ProfessionalStandardFields.TITLE, ProfessionalStandard[ProfessionalStandardFields.TITLE]);
        formData.append(ProfessionalStandardFields.NUMBER, ProfessionalStandard[ProfessionalStandardFields.NUMBER]);

        return this.put(`/api/professionalstandard/${id}/`, formData);
    }
}

export default ProfessionalStandardsService;