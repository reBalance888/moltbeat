/**
 * Утилиты для расчета калорий и макронутриентов
 */
import {
  Gender,
  ActivityLevel,
  Goal,
  Macros,
  ACTIVITY_COEFFICIENTS,
  CALORIE_DEFICIT,
  CALORIE_SURPLUS,
  MACRO_RATIOS,
  CALORIES_PER_GRAM,
} from '../types';

/**
 * Рассчитать базовый метаболизм (BMR) по формуле Миффлина-Сан Жеора
 */
export function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: Gender
): number {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

/**
 * Рассчитать общий расход энергии (TDEE)
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const coefficient = ACTIVITY_COEFFICIENTS[activityLevel] || 1.2;
  return bmr * coefficient;
}

/**
 * Рассчитать целевое количество калорий
 */
export function calculateCalories(
  weight: number,
  height: number,
  age: number,
  gender: Gender,
  activityLevel: ActivityLevel,
  goal: Goal
): number {
  const bmr = calculateBMR(weight, height, age, gender);
  const tdee = calculateTDEE(bmr, activityLevel);

  switch (goal) {
    case 'weight_loss':
      return Math.round(tdee - CALORIE_DEFICIT);
    case 'weight_gain':
      return Math.round(tdee + CALORIE_SURPLUS);
    case 'maintain':
    default:
      return Math.round(tdee);
  }
}

/**
 * Рассчитать макронутриенты (БЖУ)
 */
export function calculateMacros(dailyCalories: number, goal: Goal): Macros {
  const ratios = MACRO_RATIOS[goal] || MACRO_RATIOS.maintain;

  const proteinCalories = dailyCalories * ratios.protein;
  const fatsCalories = dailyCalories * ratios.fats;
  const carbsCalories = dailyCalories * ratios.carbs;

  return {
    protein: Math.round(proteinCalories / CALORIES_PER_GRAM.protein),
    fats: Math.round(fatsCalories / CALORIES_PER_GRAM.fats),
    carbs: Math.round(carbsCalories / CALORIES_PER_GRAM.carbs),
  };
}

/**
 * Рассчитать процент достижения цели
 */
export function calculateProgressPercentage(
  current: number,
  target: number,
  start: number
): number {
  if (start === target) {
    return 100.0;
  }

  const totalDistance = Math.abs(target - start);
  const currentDistance = Math.abs(current - start);

  const progress = (currentDistance / totalDistance) * 100;
  return Math.min(progress, 100.0);
}
