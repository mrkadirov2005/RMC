import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

const { QUESTION_TYPES, TEST_TYPES } = require('../modules/tests/questionTypes');

class QuestionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  passage_id?: number;

  @IsString()
  @IsNotEmpty()
  question_text!: string;

  @IsIn(QUESTION_TYPES)
  question_type!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  marks?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  negative_marks?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  question_order?: number;

  @IsArray()
  @IsOptional()
  options?: string[];

  @IsOptional()
  correct_answer?: any;

  @IsString()
  @IsOptional()
  explanation?: string;

  @IsString()
  @IsOptional()
  image_url?: string;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  is_required?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  word_limit?: number;

  @IsString()
  @IsOptional()
  rubric?: string;
}

class PassageDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  word_count?: number;

  @IsString()
  @IsOptional()
  difficulty_level?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  passage_order?: number;

  @IsString()
  @IsOptional()
  audio_url?: string;

  @IsString()
  @IsOptional()
  image_url?: string;
}

class CreateTestDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  center_id?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  subject_id?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  created_by?: number;

  @IsString()
  @IsOptional()
  created_by_type?: string;

  @IsString()
  @IsNotEmpty()
  test_name!: string;

  @IsIn(TEST_TYPES)
  test_type!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  instructions?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  total_marks?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  passing_marks?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  duration_minutes?: number;

  @IsString()
  @IsOptional()
  assignment_type?: string;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  is_timed?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  shuffle_questions?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  show_results_immediately?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  allow_retake?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  max_retakes?: number;

  @IsOptional()
  test_data?: any;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  is_private?: boolean;

  @IsDateString()
  @IsOptional()
  start_date?: string;

  @IsDateString()
  @IsOptional()
  end_date?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  @IsOptional()
  questions?: QuestionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PassageDto)
  @IsOptional()
  passages?: PassageDto[];
}

class UpdateTestDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  center_id?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  subject_id?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  test_name?: string;

  @IsIn(TEST_TYPES)
  @IsOptional()
  test_type?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  instructions?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  total_marks?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  passing_marks?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  duration_minutes?: number;

  @IsString()
  @IsOptional()
  assignment_type?: string;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  is_timed?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  shuffle_questions?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  show_results_immediately?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  allow_retake?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  max_retakes?: number;

  @IsOptional()
  test_data?: any;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  is_private?: boolean;

  @IsDateString()
  @IsOptional()
  start_date?: string;

  @IsDateString()
  @IsOptional()
  end_date?: string;
}

class AddQuestionDto extends QuestionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  center_id?: number;
}

class UpdateQuestionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  center_id?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  test_id?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  passage_id?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  question_text?: string;

  @IsIn(QUESTION_TYPES)
  @IsOptional()
  question_type?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  marks?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  negative_marks?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  question_order?: number;

  @IsArray()
  @IsOptional()
  options?: string[];

  @IsOptional()
  correct_answer?: any;

  @IsString()
  @IsOptional()
  explanation?: string;

  @IsString()
  @IsOptional()
  image_url?: string;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  is_required?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  word_limit?: number;

  @IsString()
  @IsOptional()
  rubric?: string;
}

class StartTestDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  center_id?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  student_id?: number;

  @IsString()
  @IsOptional()
  user_type?: string;
}

class SubmitTestDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  center_id?: number;

  @IsOptional()
  answers?: any;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  time_taken_seconds?: number;
}

class AnswerGradeDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  question_id!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  marks_obtained?: number;

  @IsString()
  @IsOptional()
  feedback?: string;
}

class GradeSubmissionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  center_id?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerGradeDto)
  @IsOptional()
  answer_grades?: AnswerGradeDto[];

  @IsString()
  @IsOptional()
  feedback?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  graded_by?: number;

  @IsString()
  @IsOptional()
  graded_by_type?: string;
}

class AssignmentItemDto {
  @IsString()
  @IsNotEmpty()
  assigned_to_type!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  assigned_to_id!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  assigned_by?: number;

  @IsDateString()
  @IsOptional()
  due_date?: string;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  is_mandatory?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}

class AssignTestDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  center_id?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignmentItemDto)
  @IsOptional()
  assignments?: AssignmentItemDto[];

  @IsString()
  @IsOptional()
  assigned_to_type?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  assigned_to_id?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  assigned_by?: number;

  @IsDateString()
  @IsOptional()
  due_date?: string;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  is_mandatory?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}

module.exports = {
  CreateTestDto,
  UpdateTestDto,
  QuestionDto,
  PassageDto,
  AddQuestionDto,
  UpdateQuestionDto,
  StartTestDto,
  SubmitTestDto,
  GradeSubmissionDto,
  AssignTestDto,
};

export {};
