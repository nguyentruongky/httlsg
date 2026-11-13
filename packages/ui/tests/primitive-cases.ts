import { createElement, type ReactElement } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Dropdown,
  EmptyState,
  ErrorMessage,
  Input,
} from "../src/index";

export function primitiveCases(): Record<string, ReactElement> {
  return {
    button: createElement(
      Button,
      { variant: "outline", size: "sm", disabled: true, className: "custom" },
      "Save",
    ),
    linkButton: createElement(
      Button,
      { asChild: true },
      createElement("a", { href: "/members" }, "Members"),
    ),
    input: createElement(Input, {
      "aria-label": "Name",
      placeholder: "Nhập họ tên…",
      defaultValue: "Example",
      className: "profile-edit-input",
    }),
    dropdown: createElement(
      Dropdown,
      { "aria-label": "Giới tính", defaultValue: "Nam" },
      createElement("option", { value: "Nam" }, "Nam"),
      createElement("option", { value: "Nữ" }, "Nữ"),
    ),
    dropdownTrigger: createElement(
      Dropdown.Trigger,
      { "aria-expanded": false },
      "Chọn vai trò quản trị",
    ),
    customDropdownTrigger: createElement(
      Dropdown.Trigger,
      { indicator: false, disabled: true, className: "min-h-14" },
      "Ban ngành",
    ),
    card: createElement(Card, { className: "p-5" }, "Content"),
    badge: createElement(Badge, null, "Admin"),
    avatar: createElement(Avatar, {
      name: "Example Member",
      variant: "member",
      colorIndex: 2,
    }),
    checkbox: createElement(Checkbox, {
      "aria-label": "Selected",
      checked: true,
      disabled: true,
    }),
    empty: createElement(EmptyState, {
      title: "Empty",
      description: "No members",
    }),
    error: createElement(ErrorMessage, { error: new Error("Cannot load") }),
  };
}
