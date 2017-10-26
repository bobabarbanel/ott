
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.imageio.ImageIO;

/**
 * This program demonstrates how to resize an image.
 *
 * @author www.codejava.net
 *
 */
public class ImageResizer {

	/**
	 * Resizes an image to a absolute width and height (the image may not be
	 * proportional)
	 * 
	 * @param inputImagePath
	 *            Path of the original image
	 * @param outputImagePath
	 *            Path to save the resized image
	 * @param scaledWidth
	 *            absolute width in pixels
	 * @param scaledHeight
	 *            absolute height in pixels
	 * @throws IOException
	 */
	public static void resize(String inputImagePath, String outputImagePath, int scaledWidth, int scaledHeight)
			throws IOException {
		// reads input image
		File inputFile = new File(inputImagePath);
		BufferedImage inputImage = ImageIO.read(inputFile);

		// creates output image
		BufferedImage outputImage = new BufferedImage(scaledWidth, scaledHeight, inputImage.getType());

		// scales the input image to the output image
		Graphics2D g2d = outputImage.createGraphics();
		g2d.drawImage(inputImage, 0, 0, scaledWidth, scaledHeight, null);
		g2d.dispose();

		// extracts extension of output file
		String formatName = outputImagePath.substring(outputImagePath.lastIndexOf(".") + 1);

		// writes to output file
		ImageIO.write(outputImage, formatName, new File(outputImagePath));
	}

	/**
	 * Resizes an image by a percentage of original size (proportional).
	 * 
	 * @param inputImagePath
	 *            Path of the original image
	 * @param outputImagePath
	 *            Path to save the resized image
	 * @param percent
	 *            a double number specifies percentage of the output image over
	 *            the input image.
	 * @throws IOException
	 */
	public static void resizeH100(String inputImagePath, String outputImagePath) throws IOException {
		// small

		File inputFile = new File(inputImagePath);
		BufferedImage inputImage = ImageIO.read(inputFile);
		double percent = 100.0 / inputImage.getHeight();

		int scaledWidth = (int) (inputImage.getWidth() * percent);
		int scaledHeight = 100;
		resize(inputImagePath, outputImagePath, scaledWidth, scaledHeight);
	}

	public static void resizeW300(String inputImagePath, String outputImagePath) throws IOException {
		// large

		File inputFile = new File(inputImagePath);
		
		BufferedImage inputImage = ImageIO.read(inputFile);
		double percent = 300.0 / inputImage.getWidth();

		int scaledWidth = 300;
		int scaledHeight = (int) (inputImage.getHeight() * percent);
		resize(inputImagePath, outputImagePath, scaledWidth, scaledHeight);
	}

	/**
	 * Test resizing images
	 */
	public static void main(String[] args) {
		String path = "C:/Users/RAbarbanel/Documents/jeffproject-master/public/images/Tools/NL/";
		String targetpath1 = "C:/Users/RAbarbanel/Documents/jeffproject-master/public/images/Tools_small/NL/";
		String targetpath2 = "C:/Users/RAbarbanel/Documents/jeffproject-master/public/images/Tools_large/NL/";
		
		File folder = new File(path);
		File[] listOfFiles = folder.listFiles();

		
		 
		 
		for (int i = 0; i < listOfFiles.length; i++) {
			
//			Matcher m = p.matcher(listOfFiles[i].getName());
//			System.out.println(i);
//			if(m.matches()) {
				System.out.println(listOfFiles[i]);
				String inputImagePath = path + listOfFiles[i].getName();
				String outputImagePath1 = targetpath1 + listOfFiles[i].getName();
				String outputImagePath2 = targetpath2 + listOfFiles[i].getName();
				
				
				try {
					if(!new File(outputImagePath1).isFile())
						ImageResizer.resizeH100(inputImagePath, outputImagePath1);
					if(!new File(outputImagePath2).isFile())
						ImageResizer.resizeW300(inputImagePath, outputImagePath2);

				} catch (IOException ex) {
					System.out.println("Error resizing the image.");
					ex.printStackTrace();
				}
			}
			
//		}
	}

}

/*
 * File folder = new File("your/path"); File[] listOfFiles = folder.listFiles();
 * 
 * for (int i = 0; i < listOfFiles.length; i++) { if (listOfFiles[i].isFile()) {
 * System.out.println("File " + listOfFiles[i].getName()); } else if
 * (listOfFiles[i].isDirectory()) { System.out.println("Directory " +
 * listOfFiles[i].getName()); } }
 */