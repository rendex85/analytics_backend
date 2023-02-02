import React from 'react';
import get from 'lodash/get';
import {appRouter} from "../../../service/router-service";
import {withRouter} from "react-router-dom";
import {Link} from "react-router-dom";

// @ts-ignore
import Scrollbars from "react-custom-scrollbars";

import Paper from '@material-ui/core/Paper';
import Typography from "@material-ui/core/Typography";
import withStyles from '@material-ui/core/styles/withStyles';
import Table from "@material-ui/core/Table";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import TableCell from "@material-ui/core/TableCell";
import TableBody from "@material-ui/core/TableBody";
import Tooltip from "@material-ui/core/Tooltip";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";

import DeleteIcon from "@material-ui/icons/DeleteOutlined";
import AttachIcon from '@material-ui/icons/AttachFileOutlined';
import WarningIcon from '@material-ui/icons/WarningRounded';

import LikeButton from "../../../components/LikeButton/LikeButton";
import ConfirmDialog from "../../../components/ConfirmDialog";


import WPBlockCreateModal from "./WPBlockCreateModal";
import ChangePlanModal from '../CreateModal';
import ModuleModal from "./ModuleModal";
import DownloadFileModal from "./DownloadFileModal";
import AddTrainingModuleModal from "../TrainingModules/AddTrainingModuleModal";

import {BlocksOfWorkProgramsType, EducationalPlanType, ModuleType} from '../types';
import {EducationalPlanDetailProps} from './types';

import {
  EducationalPlanBlockFields,
  ModuleFields,
  BlocksOfWorkProgramsFields,
  EducationalPlanFields,
  DownloadFileModalFields
} from "../enum";
import {FavoriteType} from "../../Profile/Folders/enum";
import {getUserFullName} from "../../../common/utils";
import {DirectionFields} from "../../Direction/enum";

import {WorkProgramGeneralFields} from "../../WorkProgram/enum";
import {BACHELOR_QUALIFICATION, specializationObject} from "../../WorkProgram/constants";

import {OPTIONALLY} from "../data";

import connect from './Detail.connect';
import styles from './Detail.styles';
import {fields, TrainingModuleFields} from "../TrainingModules/enum";
import FileIcon from '@material-ui/icons/DescriptionOutlined';
import classNames from "classnames";
import {selectRulesArray, typesListArray} from "../TrainingModules/constants";
import {UserType} from "../../../layout/types";
import Chip from "@material-ui/core/Chip";
import Button from "@material-ui/core/Button";
import AddIcon from "@material-ui/icons/Add";
import Dialog from "@material-ui/core/Dialog";
import UserSelector from "../../Profile/UserSelector/UserSelector";

import Service from '../service'
import WorkProgramStatus from "../../../components/WorkProgramStatus";
import {StatusPoint} from "../../../components/StatusPoint";

const planService = new Service()

class EducationalPlan extends React.Component<EducationalPlanDetailProps> {
  state = {
    deleteBlockConfirmId: null,
    deleteModuleConfirmId: null,
    selectSpecializationData: {
      blockId: null,
      id: null,
      title: null
    },
    deletedWorkProgramsLength: 0,
    addEditorsMode: false,
    tab: "1",
  }

  componentDidMount() {
    const planId = this.getPlanId();

    this.props.actions.setIsTrajectoryRoute(this.props.trajectoryRoute);

    this.props.actions.getEducationalDetail(planId);
  }

  componentWillUnmount() {
    this.props.actions.pageDown();
  }

  getPlanId = () => get(this, 'props.match.params.id');

  handleClickBlockDelete = (id: number, length: number) => () => {
    this.setState({
      deleteBlockConfirmId: id,
      deletedWorkProgramsLength: length
    });
  }

  handleConfirmBlockDeleteDialog = () => {
    const {deleteBlockConfirmId} = this.state;

    this.props.actions.deleteBlockOfWorkPrograms(deleteBlockConfirmId);
    this.closeConfirmDeleteDialog();
  }

  handleConfirmSelectSpecialization = () => {
    const {selectSpecializationData} = this.state;

    this.props.actions.planTrajectorySelectSpecialization({
      id: selectSpecializationData.id,
      blockId: selectSpecializationData.blockId,
      planId: this.getPlanId()
    });

    this.closeSelectSpecializationConfirmModal();
  }

  handleConfirmModuleDeleteDialog = () => {
    const {deleteModuleConfirmId} = this.state;

    this.props.actions.deleteModule(deleteModuleConfirmId);

    this.closeConfirmDeleteDialog();
  }

  closeConfirmDeleteDialog = () => {
    this.setState({
      deleteBlockConfirmId: null,
      deleteModuleConfirmId: null,
      deletedWorkProgramsLength: 0,
    });
  }

  handleClickDeleteModule = (id: number) => () => {
    this.setState({
      deleteModuleConfirmId: id
    });
  }

  showSelectSpecializationConfirmModal = (title: string, id: number, blockId: number) => () => {
    this.setState({
      selectSpecializationData: {
        blockId,
        title,
        id
      }
    });
  }

  closeSelectSpecializationConfirmModal = () => {
    this.setState({
      selectSpecializationData: {
        blockId: null,
        id: null,
        title: null
      }
    });
  }

  handleClickEdit = (plan: EducationalPlanType) => () => {
    this.props.actions.openDialog(plan);
  }

  handleOpenDetailModal = (block: BlocksOfWorkProgramsType|{}, moduleId: number) => () => {
    this.props.actions.openDetailDialog({
      ...block,
      moduleId
    });
  }

  handleOpenCreateModuleModal = (module: ModuleType|{}, blockId: number) => () => {
    this.props.actions.openCreateModuleDialog({
      ...module,
      blockId
    });
  }

  handleOpenAddModuleModal = (blockId: number) => () => {
    this.props.trainingModulesActions.openDialog({
      data: {
        moduleId: blockId,
      },
      dialog: fields.ADD_TRAINING_MODULE_DIALOG
    });
  }

  goToPracticePage = (id: number) => () => {
    // @ts-ignore
    const {history} = this.props;

    history.push(appRouter.getPracticeLink(id));
  }

  handleDownloadFile = (workProgramId: number) => () => {
    const {detailPlan} = this.props;

    this.props.actions.openDownloadModal({
      [DownloadFileModalFields.ACADEMIC_PLAN_ID]: detailPlan[EducationalPlanFields.ID],
      [DownloadFileModalFields.ID]: workProgramId,
    });

    this.props.actions.getDirectionsDependedOnWorkProgram(workProgramId);
  }

  handleClickLike = () => {
    const {detailPlan, trajectoryRoute} = this.props;

    if (detailPlan[EducationalPlanFields.ID_RATING]){
      this.props.foldersActions.removeFromFolder({
        id: detailPlan[EducationalPlanFields.ID_RATING],
        callback: this.props.actions.getEducationalDetail,
        type: trajectoryRoute ? FavoriteType.TRAJECTORY_PLAN : FavoriteType.ACADEMIC_PLAN,
        relationId: this.getPlanId()
      });
    } else {
      this.props.foldersActions.openAddToFolderDialog({
        relationId: this.getPlanId(),
        type: trajectoryRoute ? FavoriteType.TRAJECTORY_PLAN : FavoriteType.ACADEMIC_PLAN,
        callback: this.props.actions.getEducationalDetail
      });
    }
  }

  saveOptionalProgram = (moduleId: number, workProgram: number) => {
    this.props.actions.planTrajectorySelectOptionalWp({
      moduleId,
      workProgram,
      planId: this.getPlanId()
    });
  }

  saveElectivesProgram = (moduleId: number, workPrograms: any) => {
    this.props.actions.planTrajectorySelectElectives({workPrograms, moduleId, planId: this.getPlanId()});
  }

  getStatus = (statusCode: string) => {
    switch (statusCode) {
      case 'WK':
        return 'В работе';
      case 'EX':
        return 'На экспертизе';
      case 'AC':
        return 'Одобрено';
      case 'AR':
        return 'Архив';
      case 'RE':
        return 'На доработке';
      default:
        return '';
    }
  };
  renderBlockOfWP = (blockOfWorkPrograms: any, level: number) => {
    const {classes, detailPlan} = this.props

    const qualification = get(detailPlan, 'academic_plan_in_field_of_study[0].qualification', '');
    const maxSem = qualification === BACHELOR_QUALIFICATION ? 8 : 4;

    return (
      <>
        {blockOfWorkPrograms?.map((blockOfWorkProgram: any) => {
          const workPrograms = get(blockOfWorkProgram, BlocksOfWorkProgramsFields.WORK_PROGRAMS);
          const gia = blockOfWorkProgram?.gia || [];
          const practice = blockOfWorkProgram?.practice || [];
          const semesterStart = blockOfWorkProgram?.[BlocksOfWorkProgramsFields.SEMESTER_START]?.join(', ');
          const semesterStartArray = blockOfWorkProgram?.[BlocksOfWorkProgramsFields.SEMESTER_START];
          const type = blockOfWorkProgram[BlocksOfWorkProgramsFields.TYPE]
          const duration = blockOfWorkProgram?.work_program?.[0]?.number_of_semesters;
          const semError = semesterStartArray?.some((item: any) => {
            return (duration + item) > (maxSem + 1)
          })

          const renderRow = (title: any, itemsArray: Array<any>) => {
            const allCreditUnits = itemsArray?.[0]?.ze_v_sem;
            const creditUnitsArray = allCreditUnits?.split(', ')
            // @ts-ignore
            const indexFirstNumber1 = creditUnitsArray?.findIndex((item: number) => +item !== 0)
            const withoutZero1 = creditUnitsArray?.slice(indexFirstNumber1, creditUnitsArray.length)
            const withoutZero1Reverse = withoutZero1?.reverse()
            // @ts-ignore
            const indexFirstNumber2 = withoutZero1Reverse?.findIndex((item: number) => +item !== 0)
            const withoutZero2 = withoutZero1?.slice(indexFirstNumber2, withoutZero1.length)

            const creditUnits = withoutZero2?.reverse()?.join(' ')

            return (
              <TableRow key={blockOfWorkProgram[BlocksOfWorkProgramsFields.ID]}>
                <TableCell>
                  <div style={{ paddingLeft: (level + 1) * 5 }}>
                    {title}
                  </div>
                </TableCell>
                <TableCell style={{width: '190px'}}>
                  {creditUnits}
                </TableCell>
                <TableCell className={semError ? classes.error : undefined}>
                  {semError ? (
                    <Tooltip title='Обучение по этой дисциплине выходит за рамки обучения (длительность дисциплины больше допустимой в данном семестре)'>
                      <div style={{ width: '30px' }}>
                        {semesterStart}
                      </div>
                    </Tooltip>
                  ) : semesterStart}
                </TableCell>
                <TableCell>
                  {type === OPTIONALLY ? '-' : '+'}
                </TableCell>
                <TableCell />
              </TableRow>
            )
          }

          return (
            <>
              {Boolean(workPrograms?.length) && renderRow(workPrograms.map((workProgram: any) =>
                <div className={classes.displayFlex}>
                  <Link className={classes.link}
                        to={appRouter.getWorkProgramLink(workProgram[WorkProgramGeneralFields.ID])}
                        target="_blank"
                  >
                    {workProgram[WorkProgramGeneralFields.TITLE]}
                  </Link>
                  <div className={classes.wpStatus}>{this.getStatus(workProgram.wp_status)}</div>
                  <Tooltip
                    title={'Скачать рабочую программу'}>
                    <FileIcon
                      className={classNames(classes.marginRight10, classes.button)}
                      onClick={this.handleDownloadFile(workProgram[WorkProgramGeneralFields.ID])}
                    />
                  </Tooltip>
                </div>
              ), workPrograms)}
              {Boolean(gia?.length) && renderRow(gia.map((gia: any) =>
                <div className={classes.displayFlex}>
                  <Link className={classes.link}
                        to={appRouter.getFinalCertificationLink(gia[WorkProgramGeneralFields.ID])}
                        target="_blank"
                  >
                    {gia[WorkProgramGeneralFields.TITLE]} (ГИА)
                  </Link>
                </div>
              ), gia)}
              {Boolean(practice?.length) && renderRow(practice.map((practice: any) =>
                <div className={classes.displayFlex}>
                  <Link className={classes.link}
                        to={appRouter.getPracticeLink(practice[WorkProgramGeneralFields.ID])}
                        target="_blank"
                  >
                    {practice[WorkProgramGeneralFields.TITLE]} (практика)
                  </Link>
                </div>
              ), practice)}
            </>
          )
        })}
      </>
    )
  }

  renderModule = (item: any, level: number, blockId?: any): any => {
    const {classes, detailPlan} = this.props
    const blockOfWorkPrograms = item?.change_blocks_of_work_programs_in_modules
    const selectionRule = selectRulesArray.find(type => type.value === item?.selection_rule)?.label
    const selectionParameter = item?.selection_parametr
    const laboriousness = item?.laboriousness
    const canEdit = detailPlan[EducationalPlanFields.CAN_EDIT];

    return(
      <>
        <TableRow>
          <TableCell style={{ height: '40px'}} className={classes.moduleNameWrap}>
            <Typography className={classes.moduleName} style={{ paddingLeft: level * 5 }}>
              {'*'.repeat(level)}
              <Link to={appRouter.getTrainingModuleDetailLink(item.id)} target="_blank" className={classes.link}>
                {item?.name}
              </Link>:
            </Typography>
            <Typography>
              {laboriousness ? <>&nbsp;<b>Трудоемкость:</b> {laboriousness}</> : ''}
              {selectionRule ? <>&nbsp;<b>Правило выбора:</b> {selectionRule}</> : ''}
              {selectionParameter ? <>&nbsp;<b>Параметр выбора:</b> {selectionParameter}</> : ''}
            </Typography>
          </TableCell>
          <TableCell />
          <TableCell />
          <TableCell />
          <TableCell>
            {level === 0 && canEdit ? (
              <Tooltip title="Удалить модуль">
                <DeleteIcon className={classes.marginRight10}
                            color="primary"
                            onClick={this.handleDisconnectModule(item[ModuleFields.ID], blockId)}
                            style={{cursor: "pointer"}}
                />
              </Tooltip>
            ) : ''}
          </TableCell>
        </TableRow>
        {this.renderBlockOfWP(blockOfWorkPrograms, level)}
        {item?.childs?.map((child: any) => (
          this.renderModule(child, level + 1)
        ))}
      </>
    )
  }

  handleConnectModules = (modules: Array<number>, fatherId: number) => {
    this.props.actions.educationalPlanConnectModules({
      modules,
      blockId: fatherId,
    })
  }

  handleDisconnectModule = (module: number, blockId: number) => () => {
    this.props.actions.educationalPlanDisconnectModule({
      module,
      blockId,
    })
  }

  renderEducationPlan = () => {
    const {classes, blocks, detailPlan, trajectoryRoute, user, direction} = this.props;
    const {deleteBlockConfirmId, deleteModuleConfirmId, deletedWorkProgramsLength, selectSpecializationData} = this.state;
    const canEdit = detailPlan[EducationalPlanFields.CAN_EDIT];

    return (
      <>
        {trajectoryRoute && <Typography className={classes.trajectoryOwner}>
            <b>Направление:</b> {direction[DirectionFields.EDUCATIONAL_PROFILE]} {direction[DirectionFields.NUMBER]} {direction[DirectionFields.FACULTY]}
        </Typography>}
        {trajectoryRoute && <Typography className={classes.trajectoryOwner}>
            <b>Владелец траектории:</b> {getUserFullName(user)}
        </Typography>}

        <Scrollbars>
          <div className={classes.tableWrap}>
            <Table stickyHeader size='small'>
              <TableHead className={classes.header}>
                <TableRow>
                  <TableCell> Название </TableCell>
                  <TableCell> Зачетные единицы </TableCell>
                  <TableCell> Семестр начала </TableCell>
                  <TableCell> Обязательность </TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {blocks.map(block => {
                  const module: any = block[EducationalPlanBlockFields.MODULES]
                  const programs: any = module?.change_blocks_of_work_programs_in_modules
                  return (
                    <>
                      <TableRow className={classes.blockRow} key={'block' + block[EducationalPlanBlockFields.ID]}>
                        <TableCell colSpan={5}>
                          <div className={classes.rowBlock}>
                            {block[EducationalPlanBlockFields.NAME]}
                            {canEdit &&
                                <Tooltip title="Добавить модуль в данный блок">
                                    <AttachIcon className={classes.smallAddIcon}
                                                onClick={this.handleOpenAddModuleModal(block[EducationalPlanBlockFields.ID])}
                                    />
                                </Tooltip>
                            }
                            <b>трудоемкость</b>&nbsp;{block[EducationalPlanBlockFields.LABORIOUSNESS]}
                          </div>
                        </TableCell>
                      </TableRow>

                      {module?.map((item: any) => this.renderModule(item, 0, block?.id))}
                      {this.renderBlockOfWP(programs, -1)}
                    </>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Scrollbars>

        {!trajectoryRoute &&
            <>
                <WPBlockCreateModal />
                <ChangePlanModal />
                <ModuleModal />
                <AddTrainingModuleModal onSave={this.handleConnectModules} />
            </>
        }
        <DownloadFileModal />

        <ConfirmDialog onConfirm={this.handleConfirmModuleDeleteDialog}
                       onDismiss={this.closeConfirmDeleteDialog}
                       confirmText={'Вы точно уверены, что хотите удалить модуль?'}
                       isOpen={Boolean(deleteModuleConfirmId)}
                       dialogTitle={'Удалить модуль'}
                       confirmButtonText={'Удалить'}
        />
        <ConfirmDialog onConfirm={this.handleConfirmBlockDeleteDialog}
                       onDismiss={this.closeConfirmDeleteDialog}
                       confirmText={`Вы точно уверены, что хотите ${deletedWorkProgramsLength > 1 ? 'комлект рабочих программ' : 'рабочую программу'}?`}
                       isOpen={Boolean(deleteBlockConfirmId)}
                       dialogTitle={`Удалить ${deletedWorkProgramsLength > 1 ? 'комлект рабочих программ' : 'рабочую программу'}`}
                       confirmButtonText={'Удалить'}
        />
        <ConfirmDialog onConfirm={this.handleConfirmSelectSpecialization}
                       onDismiss={this.closeSelectSpecializationConfirmModal}
                       confirmText={`Вы точно уверены, что хотите выбрать специализацию ${selectSpecializationData.title}?`}
                       isOpen={Boolean(selectSpecializationData.id)}
                       dialogTitle={'Выбрать специализацию'}
                       confirmButtonText={'Выбрать специализацию'}
        />
      </>
    );
  }

  handleDeletingEditor = (userId: number) => () =>  {
    const {detailPlan} = this.props;
    const plan = get(detailPlan, 'academic_plan_in_field_of_study[0]', {})
    const editors = plan?.[EducationalPlanFields.EDITORS]
    const newEditorIds = editors?.map((editor: UserType) => editor.id)
      .filter((editorId: number) => editorId !== userId);

    this.props.actions.changeEditorsEducationalPlan({
      [EducationalPlanFields.ID]: plan[EducationalPlanFields.ID],
      [EducationalPlanFields.EDITORS]: newEditorIds,
    });
  }

  handleAddingEditor = (userId: number) => {
    const {detailPlan} = this.props;

    const plan = get(detailPlan, 'academic_plan_in_field_of_study[0]', {})
    const editors = plan?.[EducationalPlanFields.EDITORS]
    const newEditorIds = editors.map((editor: UserType) => editor.id).concat(userId);

    this.props.actions.changeEditorsEducationalPlan({
      [EducationalPlanFields.ID]: plan?.[EducationalPlanFields.ID],
      [EducationalPlanFields.EDITORS]: newEditorIds,
    });

    this.setState({
      addEditorsMode: false
    });
  }

  sendToCheck = () => {
    this.props.actions.sendPlanToValidate();
  }

  approvePlan = () => {
    this.props.actions.approvePlan();
  }

  sendToRework = () => {
    this.props.actions.sendPlanToRework();
  }

  downloadPlan = async () => {
    const planLink = await planService.getPlanDownloadLink(this.props.detailPlan.id);

    let tempLink = document.createElement('a');

    // @ts-ignore
    tempLink.href = planLink;

    tempLink.setAttribute('target', '_blank');

    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);

  }

  renderMain = () => {
    const {classes, detailPlan, canValidate} = this.props;

    //@ts-ignore
    const isuId = detailPlan?.ap_isu_id

    const plan = get(detailPlan, 'academic_plan_in_field_of_study[0]', {})
    const editors = plan?.[EducationalPlanFields.EDITORS]

    const {addEditorsMode} = this.state;
    const canEdit = detailPlan?.[EducationalPlanFields.CAN_EDIT];

    const newPlan = get(detailPlan, 'academic_plan_in_field_of_study[0].year', 0) >= 2023;
    const type = newPlan ? plan?.[EducationalPlanFields.PLAN_TYPE] :
      plan?.[EducationalPlanFields.PLAN_TYPE] === 'base' ? 'Базовый' : 'Индивидуальный'

    return (
      <>
        <div className={classes.editors}>
          <Typography className={classes.editorsTitle}>
            Редакторы:
          </Typography>

          {editors?.map((editor: UserType) =>
            <Chip
              key={editor.id}
              label={getUserFullName(editor)}
              onDelete={canEdit ? this.handleDeletingEditor(editor.id) : undefined}
              className={classes.editorsItem}
            />
          )}
          {editors?.length === 0 && <Typography>ни одного редактора не добавлено</Typography>}

          {canEdit && (
            <Button
              onClick={() => this.setState({addEditorsMode: true})}
              variant="outlined"
              className={classes.editorsAdd}
              size="small"
            >
              <AddIcon/> Добавить редактора
            </Button>
          )}
        </div>

        <Typography className={classes.trajectoryOwner}>
          <b>Направление:</b> {plan?.[EducationalPlanFields.FIELD_OF_STUDY]?.[0]?.title}
        </Typography>

        <Typography className={classes.trajectoryOwner}>
          <b>ОП:</b> {plan?.[EducationalPlanFields.TITLE]}
        </Typography>

        {plan?.[EducationalPlanFields.NUMBER] ? (
          <Typography className={classes.trajectoryOwner}>
            <b>Номер:</b> {plan?.[EducationalPlanFields.NUMBER]}
          </Typography>
        ) : null }

        {plan?.[EducationalPlanFields.YEAR] ? (
          <Typography className={classes.trajectoryOwner}>
            <b>Год набора:</b> {plan?.[EducationalPlanFields.YEAR]}
          </Typography>
        ) : null }

        {plan?.[EducationalPlanFields.QUALIFICATION] ? (
          <Typography className={classes.trajectoryOwner}>
            <b>Квалификация:</b> {specializationObject[plan?.[EducationalPlanFields.QUALIFICATION]]}
          </Typography>
        ) : null }

        {plan?.[EducationalPlanFields.TRAINING_PERIOD] ? (
          <Typography className={classes.trajectoryOwner}>
            <b>Срок обучения в годах:</b> {plan?.[EducationalPlanFields.TRAINING_PERIOD]}
          </Typography>
        ) : null }

        {plan?.[EducationalPlanFields.TOTAL_INTENSITY] ? (
          <Typography className={classes.trajectoryOwner}>
            <b>Количество зачетных единиц:</b> {plan?.[EducationalPlanFields.TOTAL_INTENSITY]}
          </Typography>
        ) : null }

        {detailPlan?.[EducationalPlanFields.LABORIOUSNESS] ? (
          <Typography className={classes.trajectoryOwner}>
            <b>Общая трудоемкость:</b> {detailPlan?.[EducationalPlanFields.LABORIOUSNESS]}
          </Typography>
        ) : null }

        {plan?.[EducationalPlanFields.PLAN_TYPE] ? (
          <Typography className={classes.trajectoryOwner}>
            <b>Тип плана:</b> {type}
          </Typography>
        ) : null }

        {plan?.[EducationalPlanFields.STRUCTURAL_UNIT] ? (
          <Typography className={classes.trajectoryOwner}>
            <b>Структурное подразделение:</b> {plan?.[EducationalPlanFields?.STRUCTURAL_UNIT]?.title}
          </Typography>
        ) : null }

        {plan?.[EducationalPlanFields.UNIVERSITY_PARTNER] ? (
          <Typography className={classes.trajectoryOwner}>
            <b>ВУЗ партнер:</b> {plan?.[EducationalPlanFields.UNIVERSITY_PARTNER]?.map((item: any) => item.title)?.join(', ')}
          </Typography>
        ) : null }

        {plan?.[EducationalPlanFields.MILITARY_DEPARTMENT] ? (
          <Typography className={classes.trajectoryOwner}>
            <b>Военная кафедра:</b> {plan?.[EducationalPlanFields.MILITARY_DEPARTMENT] ? 'есть' : 'нету'}
          </Typography>
        ) : null }

        {isuId ? (
          <Typography className={classes.trajectoryOwner}>
            <b>ИСУ ИД:</b> {isuId}
          </Typography>
        ) : null }

        {!canEdit && !canValidate && (
          <Typography className={classes.notifyBlock}>
            <WarningIcon style={{marginRight: 3}}/> Если Вам необходим доступ к редактированию учебного плана, обратитесь в офис сопровождения образовательных программ. (Osop@itmo.ru)
          </Typography>
        )}

        {addEditorsMode && (
          <Dialog
            open
            fullWidth
            maxWidth="sm"
            classes={{
              paper: classes.dialog,
            }}
            onClose={() => this.setState({addEditorsMode: false})}
          >
            <UserSelector
              handleChange={this.handleAddingEditor}
              selectorLabel="Выберите редактора"
              label="Выберите редактора"
              noMargin
            />
          </Dialog>
        )}
      </>
    )
  }

  checkSemestersDuration = () => {
    const {detailPlan} = this.props;
    const qualification = get(detailPlan, 'academic_plan_in_field_of_study[0].qualification', '');
    const maxSem = qualification === BACHELOR_QUALIFICATION ? 8 : 4;

    return detailPlan?.discipline_blocks_in_academic_plan?.some((item: any) => {
      return item?.modules_in_discipline_block?.some((item: any) => {
        return item?.change_blocks_of_work_programs_in_modules.some((item: any) => {
          const semesterStart = item?.semester_start;
          const duration = item?.work_program?.[0]?.number_of_semesters;
          return semesterStart?.some((item: any) => {
            return (duration + item) > (maxSem + 1)
          })
        })
      })
    })
  }

  getValidationErrors = () => {
    const {detailPlan} = this.props;
    //@ts-ignore
    const qualification = detailPlan?.academic_plan_in_field_of_study?.[0]?.qualification
    const laboriousness = detailPlan?.[EducationalPlanFields.LABORIOUSNESS]

    const errors = []
    const isValidSemesterDuration = this.checkSemestersDuration();
    const isValidLaboriousness = qualification === BACHELOR_QUALIFICATION ? laboriousness === 240 : 12

    if (!isValidLaboriousness) {
      errors.push('Общее число зачетных единиц не равно 240')
    }

    if (isValidSemesterDuration) {
      errors.push('Проверьте длительность дисциплин и семестры в которых они начинаются (длительность какой-то из дисциплин больше допустимой в данном семестре)')
    }

    return errors;
  }
  render() {
    const {classes, blocks, detailPlan, trajectoryRoute, user, direction, canSendToValidate, canValidate, statusInfo} = this.props;
    const {deleteBlockConfirmId, deleteModuleConfirmId, deletedWorkProgramsLength, selectSpecializationData} = this.state;
    const canEdit = detailPlan[EducationalPlanFields.CAN_EDIT];
    // @ts-ignore
    const canDownload = get(detailPlan, 'academic_plan_in_field_of_study[0].year', 0) >= 2023;
    const {tab} = this.state
    const validationErrors = this.getValidationErrors()
    const hasBeenSentToIsu = detailPlan[EducationalPlanFields.HAS_BEEN_SENT_TO_ISU]

    return (
      <Paper className={classes.root}>
        <div className={classes.headerWrap}>
          <StatusPoint {...statusInfo} />
          <div style={{marginRight: 'auto'}}>
            <StatusPoint
              statusText={hasBeenSentToIsu ? 'Отправлен в ИСУ' : 'Не отправлен в ису'}
              backgroundColor={hasBeenSentToIsu? '#2abb00' : '#f30707'}
            />
          </div>
          <div className={classes.headerButtons}>
            {canDownload && <Button onClick={this.downloadPlan} className={classes.buttonH32}>
              Скачать учебный план
            </Button>}
            {canSendToValidate && canEdit && (
              validationErrors.length === 0 ?
                <Button
                  onClick={this.sendToCheck}
                  className={classes.buttonH32}
                >
                  Отправить на проверку
                </Button>
              :
                <Tooltip title={validationErrors.map((item: any) => <>{item} <br/> </>)}>
                  <Button
                    className={classes.buttonH32}
                  >
                    Отправить на проверку
                  </Button>
                </Tooltip>
            )}
            {canValidate && (
              <>
                <Button className={classes.buttonH32} onClick={this.sendToRework} variant="outlined" style={{marginRight: 10}}>
                  Отправить на доработку
                </Button>
                <Button className={classes.buttonH32} onClick={this.approvePlan} variant="contained" color="primary">
                  Принять
                </Button>
              </>
            )}
            <div className={classes.likeIcon}>
              <LikeButton onClick={this.handleClickLike}
                          isLiked={Boolean(detailPlan[EducationalPlanFields.ID_RATING])}
              />
            </div>
          </div>
        </div>

        <div className={classes.title}>
          <Typography>
            Учебный план: {get(detailPlan, 'academic_plan_in_field_of_study[0].title', '')}&nbsp;
            {get(detailPlan, 'academic_plan_in_field_of_study[0].field_of_study', []).map((item: any) =>
              <>
                ({specializationObject[get(item, 'qualification', '')]} / {get(item, 'title', '')} ({get(item, 'number', '')}))&nbsp;
              </>
            )}
            - {get(detailPlan, 'academic_plan_in_field_of_study[0].year', '')}
          </Typography>
        </div>

        <Typography className={classes.noteText}>
          Если Вы включили модуль, который использовался в учебных планах 2018-2022 года, в учебный план 2023 года набора, возможны коллизии в данных, т.к. если этот план обновится в одному году, он обновится и для планов других годов набора. <b>Рекомендуем делать разные модули для разных годов набора.</b>
        </Typography>

        <Tabs value={tab} onChange={(e, value) => this.setState({tab: value})}>
          <Tab value="1" label="Главная" />
          <Tab value="2" label="Учебный план" />
        </Tabs>

        {tab === '1' ? this.renderMain() : this.renderEducationPlan()}
      </Paper>
    );
  }
}

// @ts-ignore
export default connect(withStyles(styles)(withRouter(EducationalPlan)));
