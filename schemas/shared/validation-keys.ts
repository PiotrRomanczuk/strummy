/**
 * Zod `.message` strings across /schemas are translation keys under the
 * `Validation` namespace (messages/{en,pl}.json), not raw English text.
 * Display call sites resolve them via `useTranslations('Validation')` /
 * `getTranslations('Validation')` before rendering `error.message`.
 */
export const VALIDATION_KEYS = {
  emailInvalid: 'Validation.emailInvalid',
  firstNameRequired: 'Validation.firstNameRequired',
  lastNameRequired: 'Validation.lastNameRequired',
  userIdRequired: 'Validation.userIdRequired',
  passwordMinLength: 'Validation.passwordMinLength',
  newPasswordMinLength: 'Validation.newPasswordMinLength',
  passwordRequired: 'Validation.passwordRequired',
  currentPasswordRequired: 'Validation.currentPasswordRequired',
  passwordConfirmationRequired: 'Validation.passwordConfirmationRequired',
  passwordsDontMatch: 'Validation.passwordsDontMatch',
  titleRequired: 'Validation.titleRequired',
  titleTooLong: 'Validation.titleTooLong',
  authorRequired: 'Validation.authorRequired',
  authorNameTooLong: 'Validation.authorNameTooLong',
  shortTitleTooLong: 'Validation.shortTitleTooLong',
  songIdRequired: 'Validation.songIdRequired',
  searchQueryRequired: 'Validation.searchQueryRequired',
  usernameMinLength: 'Validation.usernameMinLength',
  bioMaxLength: 'Validation.bioMaxLength',
  urlInvalid: 'Validation.urlInvalid',
  spotifyUrlInvalid: 'Validation.spotifyUrlInvalid',
} as const;
