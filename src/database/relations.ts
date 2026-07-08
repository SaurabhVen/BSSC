import { relations } from 'drizzle-orm';
import {
  roles,
  users,
  candidates,
  applications,
  applicationStepData,
  documents,
  payments,
  categories,
  educations,
  subjects,
  posts,
  invoices,
  countries,
  states,
  districts,
} from './schema';

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  candidate: one(candidates, {
    fields: [users.id],
    references: [candidates.userId],
  }),
}));

export const candidatesRelations = relations(candidates, ({ one, many }) => ({
  user: one(users, {
    fields: [candidates.userId],
    references: [users.id],
  }),
  applications: many(applications),
  documents: many(documents),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  candidate: one(candidates, {
    fields: [applications.candidateId],
    references: [candidates.id],
  }),
  stepData: many(applicationStepData),
  payments: many(payments),
}));

export const applicationStepDataRelations = relations(applicationStepData, ({ one }) => ({
  application: one(applications, {
    fields: [applicationStepData.applicationId],
    references: [applications.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  candidate: one(candidates, {
    fields: [documents.candidateId],
    references: [candidates.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  application: one(applications, {
    fields: [payments.applicationId],
    references: [applications.id],
  }),
  invoice: one(invoices, {
    fields: [payments.id],
    references: [invoices.paymentId],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  payment: one(payments, {
    fields: [invoices.paymentId],
    references: [payments.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.catParentId],
    references: [categories.catId],
    relationName: 'category_parent',
  }),
  children: many(categories, {
    relationName: 'category_parent',
  }),
}));

export const educationsRelations = relations(educations, () => ({}));

export const subjectsRelations = relations(subjects, () => ({}));

export const postsRelations = relations(posts, () => ({}));

export const countriesRelations = relations(countries, ({ many }) => ({
  states: many(states),
}));

export const statesRelations = relations(states, ({ one, many }) => ({
  country: one(countries, {
    fields: [states.countryId],
    references: [countries.countryId],
  }),
  districts: many(districts),
}));

export const districtsRelations = relations(districts, ({ one }) => ({
  state: one(states, {
    fields: [districts.stateId],
    references: [states.stateId],
  }),
}));
