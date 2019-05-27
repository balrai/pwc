import React, { Component } from "react";

export function sortCaret(order, column) {
  if (!order)
    return (
      <span>
        &nbsp;&nbsp;<i className="arrow up" />&nbsp;<i className="arrow down" />
      </span>
    );
  else if (order === "asc")
    return (
      <span>
        &nbsp;&nbsp;<i className="arrow up" />
      </span>
    );
  else if (order === "desc")
    return (
      <span>
        &nbsp;&nbsp;<i className="arrow down" />
      </span>
    );
  return null;
}
