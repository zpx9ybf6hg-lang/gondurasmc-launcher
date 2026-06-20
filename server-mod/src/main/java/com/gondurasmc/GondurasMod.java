package com.gondurasmc;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.mojang.brigadier.Command;
import net.minecraft.commands.Commands;
import net.minecraft.network.chat.Component;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.Mod;
import net.neoforged.fml.loading.FMLPaths;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.event.RegisterCommandsEvent;
import net.neoforged.neoforge.event.tick.ServerTickEvent;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

// Связь сервера с сайтом GondurasMC: /claim + учёт времени игры.
// Исходящие HTTP-запросы (порт открывать не нужно). Ключ — в config/gondurasmc.properties.
@Mod("gondurasmc")
public class GondurasMod {
    private static String WEB = "https://gondurasmc-web.fly.dev";
    private static String KEY = "";

    private static final HttpClient HTTP = HttpClient.newHttpClient();
    private static final ExecutorService POOL = Executors.newFixedThreadPool(2);
    // Задачи, которые надо выполнить в главном потоке сервера (выдача предметов, сообщения).
    private static final ConcurrentLinkedQueue<Runnable> MAIN = new ConcurrentLinkedQueue<>();
    private int ticks = 0;

    public GondurasMod() {
        loadConfig();
        NeoForge.EVENT_BUS.register(this);
    }

    private void loadConfig() {
        try {
            Path file = FMLPaths.CONFIGDIR.get().resolve("gondurasmc.properties");
            if (!Files.exists(file)) {
                Files.writeString(file, "web=https://gondurasmc-web.fly.dev\nkey=PASTE_SERVER_KEY_HERE\n");
            }
            Properties p = new Properties();
            try (var in = Files.newInputStream(file)) { p.load(in); }
            WEB = p.getProperty("web", WEB).trim();
            KEY = p.getProperty("key", "").trim();
        } catch (Exception e) {
            System.err.println("[GondurasMC] config error: " + e);
        }
    }

    @SubscribeEvent
    public void onRegisterCommands(RegisterCommandsEvent e) {
        e.getDispatcher().register(
            Commands.literal("claim").executes(ctx -> {
                ServerPlayer player;
                try { player = ctx.getSource().getPlayerOrException(); }
                catch (Exception ex) { return 0; }
                final String uuid = player.getUUID().toString();
                final String name = player.getGameProfile().getName();
                final MinecraftServer server = ctx.getSource().getServer();
                player.sendSystemMessage(Component.literal("§7Забираю предметы с сайта..."));
                POOL.submit(() -> doClaim(server, uuid, name));
                return Command.SINGLE_SUCCESS;
            })
        );
    }

    private void doClaim(MinecraftServer server, String uuid, String name) {
        try {
            String url = WEB + "/api/claim?key=" + enc(KEY) + "&uuid=" + enc(uuid);
            HttpRequest req = HttpRequest.newBuilder(URI.create(url)).GET().build();
            HttpResponse<String> res = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() != 200) { msg(server, name, "§cОшибка сайта (" + res.statusCode() + ")"); return; }
            JsonObject o = JsonParser.parseString(res.body()).getAsJsonObject();
            JsonArray items = o.getAsJsonArray("items");
            MAIN.add(() -> giveItems(server, name, items));
        } catch (Exception ex) {
            msg(server, name, "§cНет связи с сайтом");
        }
    }

    private void giveItems(MinecraftServer server, String name, JsonArray items) {
        ServerPlayer p = server.getPlayerList().getPlayerByName(name);
        if (p == null) return;
        if (items == null || items.isEmpty()) {
            p.sendSystemMessage(Component.literal("§eИнвентарь на сайте пуст"));
            return;
        }
        var src = server.createCommandSourceStack().withSuppressedOutput();
        int n = 0;
        for (var el : items) {
            JsonObject it = el.getAsJsonObject();
            String id = it.get("id").getAsString();
            int count = it.get("count").getAsInt();
            server.getCommands().performPrefixedCommand(src, "give " + name + " minecraft:" + id + " " + count);
            n++;
        }
        p.sendSystemMessage(Component.literal("§aВыдано предметов: " + n));
    }

    @SubscribeEvent
    public void onServerTick(ServerTickEvent.Post e) {
        Runnable r;
        while ((r = MAIN.poll()) != null) r.run();

        if (++ticks >= 1200) { // раз в минуту
            ticks = 0;
            MinecraftServer server = e.getServer();
            for (ServerPlayer p : server.getPlayerList().getPlayers()) {
                final String uuid = p.getUUID().toString();
                POOL.submit(() -> postPlaytime(uuid));
            }
        }
    }

    private void postPlaytime(String uuid) {
        try {
            String body = "{\"uuid\":\"" + uuid + "\",\"seconds\":60}";
            HttpRequest req = HttpRequest.newBuilder(URI.create(WEB + "/api/playtime?key=" + enc(KEY)))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body)).build();
            HTTP.send(req, HttpResponse.BodyHandlers.discarding());
        } catch (Exception ignored) {}
    }

    private void msg(MinecraftServer server, String name, String text) {
        MAIN.add(() -> {
            ServerPlayer p = server.getPlayerList().getPlayerByName(name);
            if (p != null) p.sendSystemMessage(Component.literal(text));
        });
    }

    private static String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}
