package com.nativa.pos.exception;
public class NotFoundException extends RuntimeException { public NotFoundException(String resource, Long id) { super(resource + " no encontrado: " + id); } }
