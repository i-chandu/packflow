export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export function actionSuccess<T>(data?: T): ActionResult<T> {
  return { success: true, data };
}

export function actionError(
  error: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return { success: false, error, fieldErrors };
}
