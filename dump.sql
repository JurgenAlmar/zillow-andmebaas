-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: mariadb
-- Generation Time: Sep 23, 2025 at 12:59 PM
-- Server version: 12.0.2-MariaDB-ubu2404
-- PHP Version: 8.2.27

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- Database: `zillow`

-- --------------------------------------------------------

-- Table structure for table `favorites`
CREATE TABLE `favorites` (
  `favorite_id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `property_id` int UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  UNIQUE KEY `unique_favorite` (`user_id`, `property_id`),
  PRIMARY KEY (`favorite_id`),
  KEY `user_id` (`user_id`),
  KEY `property_id` (`property_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

-- Table structure for table `inquiries`
CREATE TABLE `inquiries` (
  `inquiry_id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `property_id` int UNSIGNED NOT NULL,
  `agent_id` int UNSIGNED DEFAULT NULL,
  `message` text DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `inquiry_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`inquiry_id`),
  KEY `user_id` (`user_id`),
  KEY `property_id` (`property_id`),
  KEY `agent_id` (`agent_id`),
  CONSTRAINT `chk_inquiry_contact` CHECK (
    (message IS NOT NULL AND LENGTH(TRIM(message)) > 0) OR 
    (phone_number IS NOT NULL AND LENGTH(TRIM(phone_number)) > 0)
  ),
  CONSTRAINT `fk_inq_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `fk_inq_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`property_id`),
  CONSTRAINT `fk_inq_agent` FOREIGN KEY (`agent_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

-- Table structure for table `properties`
CREATE TABLE `properties` (
  `property_id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `owner_id` int UNSIGNED NOT NULL,
  `address` varchar(255) NOT NULL,
  `city` varchar(100) NOT NULL,
  `state` varchar(100) NOT NULL,
  `zipcode` varchar(20) DEFAULT NULL,
  `price` decimal(12,0) NOT NULL,
  `description` text DEFAULT NULL,
  `bedrooms` tinyint UNSIGNED NOT NULL,
  `bathrooms` tinyint UNSIGNED NOT NULL,
  `sqft` int UNSIGNED NOT NULL,
  `listing_at` datetime NOT NULL DEFAULT current_timestamp(),
  `status` enum('active', 'sold', 'pending') NOT NULL DEFAULT 'active',
  `property_type` enum('condo', 'house', 'apartment', 'townhouse', 'land') NOT NULL;
  PRIMARY KEY (`property_id`),
  KEY `owner_id` (`owner_id`),
  KEY `price` (`price`),
  CONSTRAINT `fk_prop_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

-- Table structure for table `property_images`
CREATE TABLE `property_images` (
  `img_id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `property_id` int UNSIGNED NOT NULL,
  `img_url` varchar(255) NOT NULL,
  `img_order` int UNSIGNED NOT NULL DEFAULT 1,
  `alt_text` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`img_id`),
  UNIQUE KEY `unique_property_image` (`property_id`, `img_url`),
  UNIQUE KEY `unique_img_order_per_property` (`property_id`, `img_order`),
  KEY `property_id` (`property_id`),
  CONSTRAINT `chk_img_order_positive` CHECK (`img_order` > 0),
  CONSTRAINT `fk_img_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`property_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

-- Table structure for table `users`
CREATE TABLE `users` (
  `user_id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `unique_username` (`username`),
  UNIQUE KEY `unique_email` (`email`),
  CONSTRAINT `chk_username_or_email` CHECK (username <> '' OR email <> '')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

COMMIT;
