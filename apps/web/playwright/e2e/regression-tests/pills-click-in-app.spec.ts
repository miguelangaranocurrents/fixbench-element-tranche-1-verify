/*
Copyright 2024 New Vector Ltd.
Copyright 2022 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { test, expect } from "../../element-web-test";

test.describe("Pills", () => {
    test.use({
        displayName: "Sally",
    });

    test("should navigate clicks internally to the app", async ({ page, app, user }) => {
        const messageRoom = "Send Messages Here";
        const targetLocalpart = "aliasssssssssssss";
        await app.client.createRoom({
            name: "Target",
            room_alias_name: targetLocalpart,
        });
        const messageRoomId = await app.client.createRoom({
            name: messageRoom,
        });

        await app.viewRoomByName(messageRoom);
        await expect(page).toHaveURL(new RegExp(`/#/room/${messageRoomId}`));

        // send a message using the built-in room mention functionality (autocomplete)
        await page
            .getByRole("textbox", { name: "Send an unencrypted message…" })
            .pressSequentially(`Hello world! Join here: #${targetLocalpart.substring(0, 3)}`);
        await page.locator(".mx_Autocomplete_Completion_title").click();
        await page.getByRole("button", { name: "Send message" }).click();

        // find the pill in the timeline and click it
        await page.getByTestId("event-tile-slot-body").locator(".mx_Pill").click();

        const localUrl = new RegExp(`/#/room/#${targetLocalpart}:`);
        // verify we landed at a sane place
        await expect(page).toHaveURL(localUrl);

        // go back to the message room and try to click on the pill text, as a user would
        await app.viewRoomByName(messageRoom);
        await expect(page).toHaveURL(new RegExp(`/#/room/${messageRoomId}`));
        const pillText = page.getByTestId("event-tile-slot-body").locator(".mx_Pill .mx_Pill_text");
        await expect(pillText).toHaveCSS("pointer-events", "none");
        await pillText.click({ force: true }); // force is to ensure we bypass pointer-events

        await expect(page).toHaveURL(localUrl);
    });

    test("should open the user's profile when clicking a user pill", async ({ page, app, user, bot }) => {
        const messageRoom = "Send Messages Here";
        const messageRoomId = await app.client.createRoom({
            name: messageRoom,
        });
        await app.client.inviteUser(messageRoomId, bot.credentials!.userId);
        await bot.joinRoom(messageRoomId);

        await app.viewRoomByName(messageRoom);
        await expect(page).toHaveURL(new RegExp(`/#/room/${messageRoomId}`));

        await app.client.sendMessage(messageRoomId, {
            msgtype: "m.text",
            body: `Hello ${bot.credentials!.userId}, welcome!`,
            format: "org.matrix.custom.html",
            formatted_body: `Hello <a href="https://matrix.to/#/${bot.credentials!.userId}">${bot.credentials!.userId}</a>, welcome!`,
        });

        // find the user pill in the timeline and click it
        const body = page.getByTestId("event-tile-slot-body").filter({ hasText: "welcome!" });
        await body.locator(".mx_Pill").click();

        // the user's profile opens in the right panel
        await expect(page.locator(".mx_UserInfo")).toBeVisible();
        // and the room stays open
        await expect(page).toHaveURL(new RegExp(`/#/room/${messageRoomId}`));
        await expect(body).toBeVisible();
    });
});
