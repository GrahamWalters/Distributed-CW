package me.grahamwalters.engine.controller;


import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import sss.Facade;
import sss.config.Algorithms;
import sss.config.Encryptors;
import sss.config.RandomSources;
import sss.crypto.data.KrawczykShare;
import sss.crypto.data.Share;

import java.util.TreeMap;


@RestController
public class EngineController {

    @RequestMapping(method = RequestMethod.POST, value = "/split")
    @ResponseBody
    public TreeMap<String, byte[]> split(@RequestParam("id") String id,
                                         @RequestParam("fileT") int fileT,
                                         @RequestParam("fileN") int fileN,
                                         @RequestParam("file") MultipartFile file) {


        TreeMap<String, byte[]> files = new TreeMap<String, byte[]>();

        try {
            RandomSources r = RandomSources.SHA1;
            Encryptors e = Encryptors.ChaCha20;
            Algorithms a = Algorithms.CSS;

            Facade f = new Facade(fileN, fileT, r, e, a);

            byte[] bytes = file.getBytes();
            Share[] shares = f.split(bytes);

            for (int i = 0; i < shares.length; i++) {
                files.put(id + i, shares[i].serialize());
            }
        } catch (Exception ex) {
            ex.printStackTrace();
        }

        return files;
    }


    @RequestMapping(method = RequestMethod.POST, value = "/join")
    @ResponseBody
    public ResponseEntity join(@RequestParam("id") String id,
                               @RequestParam("fileT") int fileT,
                               @RequestParam("fileN") int fileN,
                               @RequestParam("shares") MultipartFile[] shares) {

        if (shares.length < fileT) {
            final HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            return new ResponseEntity<String>("{\"error\":\"Not enough shares provided\"}", headers, HttpStatus.NOT_ACCEPTABLE);
        }

        try {
            RandomSources r = RandomSources.SHA1;
            Encryptors e = Encryptors.ChaCha20;
            Algorithms a = Algorithms.CSS;

            Facade f = new Facade(fileN, fileT, r, e, a);
            Share[] in = new Share[fileT];

            for (int s = 0; s < fileT; s++) {
                byte[] data = shares[s].getBytes();
                in[s] = KrawczykShare.deserialize(data);
            }

            byte[] file = f.join(in);

            final HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);

            return new ResponseEntity<byte[]>(file, headers, HttpStatus.OK);

        } catch (Exception ex) {
            ex.printStackTrace();
        }

        return null;
    }
}