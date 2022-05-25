import json
from workprogramsapp.models import ImplementationAcademicPlan, AcademicPlan, DisciplineBlock, \
    WorkProgramChangeInDisciplineBlockModule, WorkProgram, FieldOfStudy, DisciplineBlockModule, \
    WorkProgramInFieldOfStudy, WorkProgramIdStrUpForIsu, Zun, AcademicPlanUpdateConfiguration
from workprogramsapp.isu_merge.academic_plan_update.academic_plan_update_utils import AcademicPlanUpdateUtils
from workprogramsapp.isu_merge.academic_plan_update.isu_service import IsuService, IsuUser
from workprogramsapp.isu_merge.academic_plan_update.academic_plan_update_aspect import AcademicPlanUpdateAspect
from workprogramsapp.isu_merge.v_2.test_data import test_plan


class AcademicPlanUpdateProcessor:

    def __init__(self):
        self.isu_service = IsuService(
            IsuUser(
                'rpd-constructor',
                'oVrLzGwN8giUEPpBDs82c8OLuzgx2b9L'
            )
        )
        with open('workprogramsapp/modules-order.json', 'r', encoding='utf-8') as fh:
            self.order = json.load(fh)

    @staticmethod
    def __get_old_academic_plan_by_id__(plan_id):
        return AcademicPlan.objects.get(ap_isu_id=plan_id)

    @staticmethod
    def __get_disciplines_ids_by_academic_plan__(academic_plan_id):
        work_programs = WorkProgramChangeInDisciplineBlockModule. \
            objects.filter(discipline_block_module__descipline_block__academic_plan__ap_isu_id=academic_plan_id) \
            .values_list('work_program')
        disciplines_ids = []
        for work_program in work_programs:
            disciplines_ids.append(
                WorkProgram.objects.get(id=work_program[0]).discipline_code
            )
        return disciplines_ids

    @AcademicPlanUpdateAspect.discipline_difference_aspect
    def __update_disciplines__(self, old_academic_plan, isu_academic_plan_json):
        old_disciplines_ids = self.__get_disciplines_ids_by_academic_plan__(old_academic_plan.ap_isu_id)
        new_disciplines_ids = AcademicPlanUpdateUtils.get_disciplines_ids_from_academic_plan_json(
            isu_academic_plan_json)

        to_del = set(old_disciplines_ids) - set(new_disciplines_ids)

        # for wp in to_del:
        # todo get() returned more than one WorkProgram -- it returned 11!
        # WorkProgramChangeInDisciplineBlockModule. \
        #    objects.filter(work_program=WorkProgram.objects.get(discipline_code=int(wp)),
        #                   discipline_block_module__descipline_block__academic_plan__ap_isu_id=int(
        #                       isu_academic_plan_json.ap_isu_id))
        # WorkProgramChangeInDisciplineBlockModule.delete()
        return to_del

    @staticmethod
    @AcademicPlanUpdateAspect.field_of_study_changes_aspect
    def __process_field_of_study__(field_of_study_object, isu_academic_plan_json):
        if field_of_study_object is not None:
            field_of_study_object.title = isu_academic_plan_json['direction_name']
            field_of_study_object.save()
        else:
            field_of_study_object = FieldOfStudy(
                number=isu_academic_plan_json['direction_code'],
                title=isu_academic_plan_json['direction_name'].strip(),
                qualification=AcademicPlanUpdateUtils.get_qualification(isu_academic_plan_json)
            )
            field_of_study_object.save()
        return field_of_study_object

    @staticmethod
    @AcademicPlanUpdateAspect.discipline_changes_aspect
    def __process_discipline__(work_program_object, isu_academic_plan_json, isu_academic_plan_discipline_json,
                               module_object):
        if work_program_object is None:
            work_program_object = WorkProgram(
                title=isu_academic_plan_discipline_json['discipline_name'].strip(),
                subject_code=isu_academic_plan_discipline_json['plan_order'],
                qualification=AcademicPlanUpdateUtils.get_qualification(isu_academic_plan_json),
                discipline_code=isu_academic_plan_discipline_json['disc_id']
            )
            work_program_object.save()

        def watchmaker(hours, ze):
            ze = ze
            sem = 0
            all_ze_indexes_in_rpd = 0
            lecture_hours_v2 = [0, 0, 0, 0]
            for i in hours:
                if ze[all_ze_indexes_in_rpd] >= 1.0:
                    lecture_hours_v2[sem] = i
                    sem += 1
                all_ze_indexes_in_rpd += 1

            return str(lecture_hours_v2).strip("[]")

        def semesters(ze):
            sem = 0
            for i in ze:
                if i > 0:
                    sem += 1
            return sem

        ze = AcademicPlanUpdateUtils.get_ze(isu_academic_plan_discipline_json)
        lec = AcademicPlanUpdateUtils.get_lec(isu_academic_plan_discipline_json)
        prac = AcademicPlanUpdateUtils.get_prac(isu_academic_plan_discipline_json)
        lab = AcademicPlanUpdateUtils.get_lab(isu_academic_plan_discipline_json)

        work_program_object.number_of_semesters = int(
            semesters([float(x) for x in ze])
        )

        work_program_object.lecture_hours_v2 = watchmaker(
            [float(x) for x in lec],
            [float(x) for x in ze]
        )

        work_program_object.practice_hours_v2 = watchmaker(
            [float(x) for x in prac],
            [float(x) for x in ze]
        )

        work_program_object.lab_hours_v2 = watchmaker(
            [float(x) for x in lab],
            [float(x) for x in ze]
        )

        work_program_object.srs_hours_v2 = watchmaker(
            [
                float(x) for x in
                AcademicPlanUpdateUtils.set_srs(
                    AcademicPlanUpdateUtils.get_srs(
                        ze,
                        lec,
                        prac,
                        lab
                    ),
                    ze,
                    lec,
                    prac,
                    lab,
                    module_object.name
                )
            ],
            [float(x) for x in ze]
        )

        work_program_object.discipline_code = isu_academic_plan_discipline_json['disc_id']
        work_program_object.save()
        return work_program_object

    @staticmethod
    @AcademicPlanUpdateAspect.academic_plan_changes_aspect
    def __process_academic_plan__(implementation_academic_plan_object, isu_academic_plan_json, field_of_study):
        if implementation_academic_plan_object is not None:
            implementation_academic_plan_object.op_isu_id = int(isu_academic_plan_json['edu_program_id'])
            implementation_academic_plan_object.ap_isu_id = int(isu_academic_plan_json['id'])
            implementation_academic_plan_object.ns_id = int(isu_academic_plan_json['ns_id'])
            implementation_academic_plan_object.title = isu_academic_plan_json['edu_program_name']
            implementation_academic_plan_object.field_of_study.add(field_of_study)
            implementation_academic_plan_object.save()
        else:
            implementation_academic_plan_object = ImplementationAcademicPlan(
                title=isu_academic_plan_json['edu_program_name'],
                year=isu_academic_plan_json['selection_year'],
                language=AcademicPlanUpdateUtils.get_op_language(isu_academic_plan_json),
                qualification=AcademicPlanUpdateUtils.get_qualification(isu_academic_plan_json)
            )
            implementation_academic_plan_object.op_isu_id = int(isu_academic_plan_json['edu_program_id'])
            implementation_academic_plan_object.ap_isu_id = int(isu_academic_plan_json['id'])
            implementation_academic_plan_object.ns_id = int(isu_academic_plan_json['ns_id'])
            implementation_academic_plan_object.title = isu_academic_plan_json['edu_program_name']
            implementation_academic_plan_object.save()
            implementation_academic_plan_object.field_of_study.add(field_of_study)
            implementation_academic_plan_object.save()
        if AcademicPlan.objects.filter(ap_isu_id=int(isu_academic_plan_json['id'])).exists():
            academic_plan_object = AcademicPlan.objects.get(ap_isu_id=int(isu_academic_plan_json['id']))
            implementation_academic_plan_object.academic_plan = academic_plan_object
            implementation_academic_plan_object.save()
        else:
            academic_plan_object = AcademicPlan()
            academic_plan_object.ap_isu_id = int(isu_academic_plan_json['id'])
            implementation_academic_plan_object.academic_plan = academic_plan_object
            implementation_academic_plan_object.save()
        return academic_plan_object, implementation_academic_plan_object

    @staticmethod
    @AcademicPlanUpdateAspect.discipline_block_changes_aspect
    def __process_discipline_block__(discipline_block_object, isu_academic_plan_block_json, academic_plan_object):
        if discipline_block_object is not None:
            return discipline_block_object
        else:
            discipline_block_object = DisciplineBlock(
                name=isu_academic_plan_block_json['block_name'],
                academic_plan=academic_plan_object
            )
            discipline_block_object.save()
        return discipline_block_object

    @AcademicPlanUpdateAspect.discipline_block_module_changes_aspect
    def __process_block_module__(self, discipline_block_module_object, isu_academic_plan_block_module_json,
                                 discipline_block_object):
        if discipline_block_module_object is not None:
            return discipline_block_module_object
        else:
            discipline_block_module_object = DisciplineBlockModule(
                name=isu_academic_plan_block_module_json['module_name'],
                order=AcademicPlanUpdateUtils.get_module_order(self.order, isu_academic_plan_block_module_json)
            )
            discipline_block_module_object.save()
            discipline_block_module_object.descipline_block.add(discipline_block_object)
            discipline_block_module_object.save()
        return discipline_block_module_object

    @staticmethod
    def __process_linked_data__(mdb, wp_obj, isu_academic_plan_json, isu_academic_plan_discipline_json):
        if isu_academic_plan_discipline_json['is_optional']:
            option = 'Optionally'
        else:
            option = 'Required'

        if (option == 'Optionally'
                and WorkProgramChangeInDisciplineBlockModule.objects.filter(
                    discipline_block_module=mdb,
                    change_type=option,
                    subject_code=AcademicPlanUpdateUtils.num_to_int(
                        isu_academic_plan_discipline_json['plan_order'],
                        isu_academic_plan_discipline_json['discipline_name']
                    )
                ).exists()):
            wpchangemdb = WorkProgramChangeInDisciplineBlockModule.objects.get(
                discipline_block_module=mdb,
                change_type=option,
                subject_code=AcademicPlanUpdateUtils.num_to_int(
                    isu_academic_plan_discipline_json['plan_order'],
                    isu_academic_plan_discipline_json['discipline_name']
                )
            )
            if WorkProgramInFieldOfStudy.objects.filter(
                    work_program_change_in_discipline_block_module=wpchangemdb,
                    work_program=wp_obj
            ).exists():
                wpinfs = WorkProgramInFieldOfStudy.objects.get(
                    work_program_change_in_discipline_block_module=wpchangemdb,
                    work_program=wp_obj
                )
                wpinfs.save()
            else:
                wpinfs = WorkProgramInFieldOfStudy(
                    work_program_change_in_discipline_block_module=wpchangemdb,
                    work_program=wp_obj
                )
                wpinfs.save()
        elif WorkProgramChangeInDisciplineBlockModule.objects.filter(
                discipline_block_module=mdb,
                change_type=option,
                work_program=wp_obj
        ).exists():
            wpinfs = WorkProgramInFieldOfStudy.objects.get(
                work_program_change_in_discipline_block_module=WorkProgramChangeInDisciplineBlockModule.objects.get(
                    discipline_block_module=mdb,
                    change_type=option,
                    work_program=wp_obj
                ),
                work_program=wp_obj
            )
            wpinfs.save()
        else:
            wpchangemdb = WorkProgramChangeInDisciplineBlockModule()
            wpchangemdb.credit_units = AcademicPlanUpdateUtils.get_ze(isu_academic_plan_discipline_json)
            wpchangemdb.change_type = option
            wpchangemdb.discipline_block_module = mdb
            wpchangemdb.subject_code = AcademicPlanUpdateUtils.num_to_int(
                isu_academic_plan_discipline_json['plan_order'],
                isu_academic_plan_discipline_json['discipline_name']
            )
            wpchangemdb.save()
            if WorkProgramInFieldOfStudy.objects.filter(
                    work_program_change_in_discipline_block_module=wpchangemdb,
                    work_program=wp_obj
            ).exists():
                wpinfs = WorkProgramInFieldOfStudy.objects.get(
                    work_program_change_in_discipline_block_module=wpchangemdb,
                    work_program=wp_obj
                )
                wpinfs.save()
            else:
                wpinfs = WorkProgramInFieldOfStudy(
                    work_program_change_in_discipline_block_module=wpchangemdb,
                    work_program=wp_obj
                )
                wpinfs.save()
        try:
            WorkProgramIdStrUpForIsu.objects.get(
                id_str_up=int(isu_academic_plan_discipline_json['str_up_id']),
                ns_id=int(isu_academic_plan_json['ns_id']),
                work_program_in_field_of_study=wpinfs
            )
        except WorkProgramIdStrUpForIsu.DoesNotExist:
            wpinfs_id_str_up = WorkProgramIdStrUpForIsu(
                id_str_up=int(isu_academic_plan_discipline_json['str_up_id']),
                ns_id=int(isu_academic_plan_json['ns_id']),
                work_program_in_field_of_study=wpinfs
            )
            wpinfs_id_str_up.number = AcademicPlanUpdateUtils.num_to_int(
                isu_academic_plan_discipline_json['plan_order'],
                isu_academic_plan_discipline_json['discipline_name']
            )
            wpinfs_id_str_up.dis_id = isu_academic_plan_discipline_json['dis_id']
            wpinfs_id_str_up.ze_v_sem = AcademicPlanUpdateUtils.get_ze(isu_academic_plan_discipline_json)
            wpinfs_id_str_up.lec_v_sem = AcademicPlanUpdateUtils.get_lec(isu_academic_plan_discipline_json)
            wpinfs_id_str_up.prak_v_sem = AcademicPlanUpdateUtils.get_prac(isu_academic_plan_discipline_json)
            wpinfs_id_str_up.lab_v_sem = AcademicPlanUpdateUtils.get_lab(isu_academic_plan_discipline_json)
            wpinfs_id_str_up.ekz_v_sem = AcademicPlanUpdateUtils.set_control(
                isu_academic_plan_discipline_json['exam'],
                int(float(isu_academic_plan_json['training_period']))
            )
            wpinfs_id_str_up.zach_v_sem = AcademicPlanUpdateUtils.set_control(
                isu_academic_plan_discipline_json['credit'],
                int(float(isu_academic_plan_json['training_period']))
            )
            wpinfs_id_str_up.dif_zach_v_sem = AcademicPlanUpdateUtils.set_control(
                isu_academic_plan_discipline_json['diff_credit'],
                int(float(isu_academic_plan_json['training_period']))
            )
            wpinfs_id_str_up.kp_v_sem = AcademicPlanUpdateUtils.set_control(
                isu_academic_plan_discipline_json['course_project'],
                int(float(isu_academic_plan_json['training_period']))
            )
            wpinfs_id_str_up.save()

            for zun in Zun.objects.filter(
                    wp_in_fs_saved_fk_id_str_up=int(isu_academic_plan_discipline_json['str_up_id'])
            ):
                zun.wp_in_fs = wpinfs
                zun.save()

    def update_academic_plans(self):
        # todo make executable
        academic_plans_ids = AcademicPlanUpdateConfiguration.objects.get().values_list('academic_plan_ids', flat=True)
        #cademic_plans_ids = [10572]

        for plan_id in academic_plans_ids:
            plan_id = str(plan_id)

            old_academic_plan = self.__get_old_academic_plan_by_id__(plan_id)
            isu_academic_plan_json = self.isu_service.get_academic_plan(plan_id)
            #isu_academic_plan_json = json.loads(json.dumps(test_plan['result']))

            if isu_academic_plan_json is not None:
                self.__update_disciplines__(old_academic_plan, isu_academic_plan_json)

                field_of_study = self.__process_field_of_study__(isu_academic_plan_json)

                academic_plan = self.__process_academic_plan__(isu_academic_plan_json, field_of_study)

                for block in isu_academic_plan_json['disciplines_blocks']:
                    discipline_block_object = self.__process_discipline_block__(block, academic_plan)
                    for module in block['discipline_modules']:
                        module_object = self.__process_block_module__(module, discipline_block_object)
                        for disc in module['disciplines']:
                            work_program_object = self \
                                .__process_discipline__(isu_academic_plan_json, disc, module_object)
                            self.__process_linked_data__(
                                module_object,
                                work_program_object,
                                isu_academic_plan_json,
                                disc
                            )
