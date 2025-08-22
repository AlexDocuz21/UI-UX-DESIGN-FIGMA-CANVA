# UI vs UX Design – Dissertation Project

This repository contains my Master's Dissertation project, which explores the differences between **UI-focused** and **UX-focused** workflows.  
The project is divided into two main parts:

1. **FocusFlow (Node.js Application)** – a time-blocking productivity app.  
2. **UI/UX Design Prototype** – a comparative study using Figma and Canva, supported by static HTML/CSS.

---

##  Repository Structure
UI-UX-DESIGN-FIGMA-CANVA/
│── focusflow/ # Node.js + Express + SQLite productivity app
│── ui-ux/ # Static HTML/CSS files 
│── .gitignore
│── README.md


---

## FocusFlow – Productivity App

**FocusFlow** is a full-stack web application built with **Node.js, Express, and SQLite**.  
It implements a **time-blocking workflow**, allowing users to create, edit, and manage tasks in a structured way.

### Features
- Quick Add (defaults to 1 hour, auto-shifts to the next day if the time passed).  
- Create/Edit/Delete custom time blocks.  
- Session-based validation & error feedback.  
- Simple UI planned in Figma.  

### Run Locally
```bash
cd focusflow
npm install
cp env-example .env
node database/init.js   # optional: initialize database
npm start
```
ENV Variables
```ini
SESSION_SECRET=change_me
PORT=3000
DATABASE_URL=sqlite:./database/focusflow.sqlite
```
UI/UX Design Prototype

This part of the dissertation compares UI (User Interface) vs UX (User Experience) approaches using Figma and Canva.

UI (Figma): visual prototypes, color systems, structured layouts.

UX (Canva): quick workflows, static HTML/CSS implementation.


Tech Stack

Backend: Node.js, Express

Database: SQLite

Frontend: HTML, CSS

Design Tools: Figma, Canva

Academic Context

This project was developed as part of my Master’s Dissertation in Information Technology.
The goal was to:

Compare UI vs UX workflows in modern design tools.

Build a working application (FocusFlow) to support productivity through time-blocking.

Analyze how design choices affect implementation, usability, and collaboration.

Key Skills Demonstrated

Full-stack web development (Node.js, Express, SQLite)

Front-end prototyping (HTML, CSS, Figma, Canva)

API design, validation, and database modeling

Git/GitHub workflows, documentation, Agile practices
