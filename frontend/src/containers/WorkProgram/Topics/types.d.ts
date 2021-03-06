import {WithStyles} from "@material-ui/core";
import {WorkProgramActions} from '../types';
import {SectionType} from "../types";
import styles from "./Topics.styles";

export interface TopicsProps extends WithStyles<typeof styles> {
    actions: WorkProgramActions;
    sections: Array<SectionType>;
    isCanEdit: boolean;
}