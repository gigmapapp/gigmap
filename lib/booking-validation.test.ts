import assert from "node:assert/strict";
import test from "node:test";
import {
  firstBookingField,
  hasBookingErrors,
  validateBookingFields,
} from "./booking-validation";

const valid = {
  contactName: "Jordan Lee",
  contactEmail: "you@email.com",
  eventDetails: "Backyard set",
  preferredDate: "2026-10-04",
  preferredLocation: "East Austin",
};

test("validateBookingFields accepts a complete request", () => {
  const errors = validateBookingFields(valid);
  assert.equal(hasBookingErrors(errors), false);
});

test("validateBookingFields reports each missing field", () => {
  const errors = validateBookingFields({
    contactName: "  ",
    contactEmail: "",
    eventDetails: "",
    preferredDate: "",
    preferredLocation: " ",
  });
  assert.equal(errors.contactName, "Name is required.");
  assert.equal(errors.contactEmail, "Enter a valid email.");
  assert.equal(errors.eventDetails, "Tell us about the event.");
  assert.equal(errors.preferredDate, "Preferred date is required.");
  assert.equal(errors.preferredLocation, "Preferred location is required.");
  assert.equal(firstBookingField(errors), "contactName");
});

test("validateBookingFields rejects a malformed email", () => {
  const errors = validateBookingFields({ ...valid, contactEmail: "not-an-email" });
  assert.deepEqual(errors, { contactEmail: "Enter a valid email." });
  assert.equal(firstBookingField(errors), "contactEmail");
});
